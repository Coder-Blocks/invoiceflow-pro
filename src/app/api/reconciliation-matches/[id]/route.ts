import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED']),
});

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

        const match = await prisma.reconciliationMatch.update({
            where: {
                id: params.id,
                organizationId: session.user.activeOrgId,
            },
            data: {
                status: validated.status,
                matchedAt: validated.status === 'CONFIRMED' ? new Date() : null,
                matchedBy: session.user.id,
            },
            include: {
                bankTransaction: true,
                payment: true,
                invoice: true,
            },
        });

        // If confirmed, mark the bank transaction as matched (no further action needed)
        // Optionally, update invoice status if payment was matched
        if (validated.status === 'CONFIRMED' && match.paymentId) {
            // Payment already recorded, but ensure invoice status is updated
            const payment = match.payment;
            if (payment?.invoiceId) {
                const invoice = await prisma.invoice.findUnique({
                    where: { id: payment.invoiceId },
                    include: { payments: true },
                });
                if (invoice) {
                    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
                    let newStatus = invoice.status;
                    if (paidAmount >= invoice.total) newStatus = 'PAID';
                    else if (paidAmount > 0) newStatus = 'PARTIAL_PAID';
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: { status: newStatus, paidAt: newStatus === 'PAID' ? new Date() : null },
                    });
                }
            }
        }

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: validated.status === 'CONFIRMED' ? 'CONFIRM_MATCH' : 'REJECT_MATCH',
                entity: 'RECONCILIATION',
                entityId: match.id,
                details: { bankTransactionId: match.bankTransactionId },
            },
        });

        return NextResponse.json(match);
    } catch (error) {
        return new NextResponse('Internal server error', { status: 500 });
    }
}