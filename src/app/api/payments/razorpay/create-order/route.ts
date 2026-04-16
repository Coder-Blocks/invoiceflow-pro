import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
    invoiceId: z.string(),
    amount: z.number().positive(),
    currency: z.string().default('INR'),
});

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = schema.parse(body);

        // Verify invoice exists and belongs to org
        const invoice = await prisma.invoice.findUnique({
            where: {
                id: validated.invoiceId,
                organizationId: session.user.activeOrgId,
            },
            include: { customer: true },
        });

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: Math.round(validated.amount * 100), // Razorpay expects amount in paise
            currency: validated.currency,
            receipt: `rcpt_${invoice.invoiceNumber}`,
            notes: {
                invoiceId: invoice.id,
                organizationId: session.user.activeOrgId,
                customerEmail: invoice.customer?.email || '',
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        return new NextResponse('Failed to create order', { status: 500 });
    }
}