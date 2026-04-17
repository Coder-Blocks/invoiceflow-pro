import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const paymentSchema = z.object({
    invoiceId: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    amount: z.number().positive('Amount must be positive'),
    paymentDate: z.string().min(1, 'Payment date is required'),
    paymentMethod: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

function parseFlexibleDate(input: string, fieldName: string): Date {
    if (!input || typeof input !== 'string') {
        throw new Error(`${fieldName} is required`);
    }

    const trimmed = input.trim();

    // Supports YYYY-MM-DD from <input type="date">
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const date = new Date(`${trimmed}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`Invalid ${fieldName.toLowerCase()}`);
        }
        return date;
    }

    // Supports full ISO datetime too
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName.toLowerCase()}`);
    }

    return date;
}

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    const invoiceId = searchParams.get('invoiceId');
    const customerId = searchParams.get('customerId');

    const where: Record<string, unknown> = {
        organizationId: session.user.activeOrgId,
    };

    if (invoiceId) where.invoiceId = invoiceId;
    if (customerId) where.customerId = customerId;

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: {
                invoice: {
                    select: { invoiceNumber: true },
                },
                customer: {
                    select: { name: true },
                },
            },
            orderBy: { paymentDate: 'desc' },
            skip,
            take: limit,
        }),
        prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
        payments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
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

        const parsedPaymentDate = parseFlexibleDate(validated.paymentDate, 'Payment date');

        let customerId = validated.customerId ?? null;

        if (validated.invoiceId) {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    id: validated.invoiceId,
                    organizationId: session.user.activeOrgId,
                },
                select: {
                    id: true,
                    customerId: true,
                },
            });

            if (!invoice) {
                return new NextResponse('Invoice not found', { status: 404 });
            }

            customerId = invoice.customerId;
        }

        if (!customerId) {
            return new NextResponse('Customer is required', { status: 400 });
        }

        const payment = await prisma.payment.create({
            data: {
                organizationId: session.user.activeOrgId,
                invoiceId: validated.invoiceId ?? null,
                customerId,
                amount: validated.amount,
                paymentDate: parsedPaymentDate,
                paymentMethod: validated.paymentMethod ?? null,
                reference: validated.reference ?? null,
                notes: validated.notes ?? null,
            },
        });

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
        console.error('Payment creation error:', error);

        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0]?.message || 'Invalid input', {
                status: 400,
            });
        }

        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 });
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

    const paidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const total = invoice.total;

    let newStatus = invoice.status;

    if (paidAmount >= total) {
        newStatus = 'PAID';
    } else if (paidAmount > 0) {
        newStatus = 'PARTIAL_PAID';
    } else if (invoice.status === 'PARTIAL_PAID' && paidAmount === 0) {
        newStatus = 'SENT';
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