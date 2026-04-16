import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    customerId: z.string().optional().nullable(),
    poNumber: z.string().optional().nullable(),
    issueDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    footer: z.string().optional().nullable(),
});

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
        include: {
            customer: true,
            items: true,
            payments: true,
        },
    });

    if (!invoice) {
        return new NextResponse('Invoice not found', { status: 404 });
    }

    // Calculate amount paid
    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = invoice.total - paidAmount;

    return NextResponse.json({ ...invoice, paidAmount, balanceDue });
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = updateSchema.parse(body);

        const invoice = await prisma.invoice.update({
            where: {
                id: params.id,
                organizationId: session.user.activeOrgId,
            },
            data: {
                ...validated,
                issueDate: validated.issueDate ? new Date(validated.issueDate) : undefined,
                dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'UPDATE',
                entity: 'INVOICE',
                entityId: invoice.id,
                details: { changes: validated },
            },
        });

        return NextResponse.json(invoice);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only allow deletion of draft invoices
    const invoice = await prisma.invoice.findUnique({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
    });

    if (!invoice) {
        return new NextResponse('Invoice not found', { status: 404 });
    }

    if (invoice.status !== 'DRAFT') {
        return new NextResponse('Only draft invoices can be deleted', { status: 400 });
    }

    await prisma.invoice.delete({
        where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
}