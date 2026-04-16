import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const estimate = await prisma.estimate.findUnique({
        where: {
            id,
            organizationId: session.user.activeOrgId,
        },
        include: {
            customer: true,
            items: true,
            organization: true,
        },
    });

    if (!estimate) {
        return new NextResponse('Estimate not found', { status: 404 });
    }

    if (estimate.convertedInvoiceId) {
        return new NextResponse('Estimate already converted', { status: 400 });
    }

    const org = estimate.organization;
    const prefix = org?.invoicePrefix || 'INV';
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
        where: { organizationId: session.user.activeOrgId },
    });
    const invoiceNumber = `${prefix}-${year}${String(count + 1).padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
        data: {
            organizationId: session.user.activeOrgId,
            customerId: estimate.customerId,
            invoiceNumber,
            poNumber: null,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            currency: estimate.currency,
            status: 'DRAFT',
            subtotal: estimate.subtotal,
            taxTotal: estimate.taxTotal,
            discountTotal: estimate.discountTotal,
            total: estimate.total,
            notes: estimate.notes,
            terms: estimate.terms,
            footer: estimate.footer,
            items: {
                create: estimate.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate,
                    discount: item.discount,
                    amount: item.amount,
                })),
            },
        },
    });

    await prisma.estimate.update({
        where: { id },
        data: {
            status: 'CONVERTED',
            convertedAt: new Date(),
            convertedInvoiceId: invoice.id,
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: session.user.id,
            organizationId: session.user.activeOrgId,
            action: 'CONVERT',
            entity: 'ESTIMATE',
            entityId: estimate.id,
            details: { convertedTo: invoice.id },
        },
    });

    return NextResponse.json({ invoice, estimate });
}