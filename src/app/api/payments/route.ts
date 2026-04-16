import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const paymentSchema = z.object({
    invoiceId: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    amount: z.number().positive('Amount must be positive'),
    paymentDate: z.string().datetime(),
    paymentMethod: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const invoiceId = searchParams.get('invoiceId');
    const customerId = searchParams.get('customerId');

    const where: any = {
        organizationId: session.user.activeOrgId,
    };
    if (invoiceId) where.invoiceId = invoiceId;
    if (customerId) where.customerId = customerId;

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: {
                invoice: { select: { invoiceNumber: true } },
                customer: { select: { name: true } },
            },
            orderBy: { paymentDate: 'desc' },
            skip,
            take: limit,
        }),
        prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
        payments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = paymentSchema.parse(body);

        // If invoiceId provided, automatically set customerId from invoice
        let customerId = validated.customerId;
        if (validated.invoiceId) {
            const invoice = await prisma.invoice.findUnique({
                where: { id: validated.invoiceId },
                select: { customerId: true },
            });
            if (invoice) customerId = invoice.customerId;
        }

        const payment = await prisma.payment.create({
            data: {
                organizationId: session.user.activeOrgId,
                invoiceId: validated.invoiceId,
                customerId: customerId,
                amount: validated.amount,
                paymentDate: new Date(validated.paymentDate),
                paymentMethod: validated.paymentMethod,
                reference: validated.reference,
                notes: validated.notes,
            },
        });

        // Update invoice status based on payments
        if (validated.invoiceId) {
            await updateInvoiceStatus(validated.invoiceId);
        }

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'CREATE',
                entity: 'PAYMENT',
                entityId: payment.id,
            },
        });

        return NextResponse.json(payment);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

async function updateInvoiceStatus(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
    });
    if (!invoice) return;

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const total = invoice.total;

    let newStatus = invoice.status;
    if (paidAmount >= total) {
        newStatus = 'PAID';
    } else if (paidAmount > 0) {
        newStatus = 'PARTIAL_PAID';
    } else if (invoice.status === 'PARTIAL_PAID' && paidAmount === 0) {
        newStatus = 'SENT'; // fallback
    }

    if (newStatus !== invoice.status) {
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: newStatus,
                paidAt: newStatus === 'PAID' ? new Date() : null,
            },
        });
    }
}