import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    billingAddress: z.any().optional(),
    taxId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const customer = await prisma.customer.findUnique({
        where: { id, organizationId: session.user.activeOrgId },
        include: {
            invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
            payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
            _count: { select: { invoices: true } },
        },
    });

    if (!customer) {
        return new NextResponse('Customer not found', { status: 404 });
    }

    const invoicesTotal = await prisma.invoice.aggregate({
        where: { customerId: id, organizationId: session.user.activeOrgId },
        _sum: { total: true },
    });
    const paymentsTotal = await prisma.payment.aggregate({
        where: { customerId: id, organizationId: session.user.activeOrgId },
        _sum: { amount: true },
    });
    const outstanding = (invoicesTotal._sum.total || 0) - (paymentsTotal._sum.amount || 0);

    return NextResponse.json({ ...customer, outstanding });
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { id } = await context.params;
        const body = await req.json();
        const validated = updateSchema.parse(body);

        const customer = await prisma.customer.update({
            where: { id, organizationId: session.user.activeOrgId },
            data: validated,
        });

        return NextResponse.json(customer);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    await prisma.customer.update({
        where: { id, organizationId: session.user.activeOrgId },
        data: { archived: true },
    });

    return new NextResponse(null, { status: 204 });
}