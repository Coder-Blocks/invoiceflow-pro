import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    const { id } = await context.params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment || payment.organizationId !== session.user.activeOrgId) return new NextResponse('Payment not found', { status: 404 });
    await prisma.payment.delete({ where: { id } });
    if (payment.invoiceId) {
        const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId }, include: { payments: true } });
        if (invoice) {
            const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            let newStatus = invoice.status;
            if (paidAmount >= invoice.total) newStatus = 'PAID';
            else if (paidAmount > 0) newStatus = 'PARTIAL_PAID';
            else if (invoice.status === 'PARTIAL_PAID') newStatus = 'SENT';
            await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: newStatus, paidAt: newStatus === 'PAID' ? new Date() : null } });
        }
    }
    return new NextResponse(null, { status: 204 });
}