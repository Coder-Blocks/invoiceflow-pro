import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

const schema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
    invoiceId: z.string(),
    amount: z.number(),
});

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = schema.parse(body);

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(validated.razorpay_order_id + '|' + validated.razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== validated.razorpay_signature) {
            return new NextResponse('Invalid signature', { status: 400 });
        }

        // Verify invoice
        const invoice = await prisma.invoice.findUnique({
            where: {
                id: validated.invoiceId,
                organizationId: session.user.activeOrgId,
            },
        });

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }

        // Record payment
        const payment = await prisma.payment.create({
            data: {
                organizationId: session.user.activeOrgId,
                invoiceId: invoice.id,
                customerId: invoice.customerId,
                amount: validated.amount,
                paymentDate: new Date(),
                paymentMethod: 'Razorpay',
                reference: validated.razorpay_payment_id,
            },
        });

        // Update invoice status
        const paidAmount = await prisma.payment.aggregate({
            where: { invoiceId: invoice.id },
            _sum: { amount: true },
        });

        let newStatus = invoice.status;
        if ((paidAmount._sum.amount || 0) >= invoice.total) {
            newStatus = 'PAID';
        } else if ((paidAmount._sum.amount || 0) > 0) {
            newStatus = 'PARTIAL_PAID';
        }

        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: newStatus, paidAt: newStatus === 'PAID' ? new Date() : null },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'CREATE',
                entity: 'PAYMENT',
                entityId: payment.id,
                details: { method: 'Razorpay', invoiceId: invoice.id },
            },
        });

        // Create notification
        const members = await prisma.organizationMember.findMany({
            where: { organizationId: session.user.activeOrgId },
            select: { userId: true },
        });

        await prisma.notification.createMany({
            data: members.map(m => ({
                userId: m.userId,
                title: 'Payment Received',
                message: `Payment of ₹${validated.amount} received for invoice ${invoice.invoiceNumber}`,
                type: 'success',
                actionUrl: `/dashboard/invoices/${invoice.id}`,
            })),
        });

        return NextResponse.json({ success: true, paymentId: payment.id });
    } catch (error) {
        console.error('Razorpay verification error:', error);
        return new NextResponse('Verification failed', { status: 500 });
    }
}