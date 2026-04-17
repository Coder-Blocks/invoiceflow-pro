import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentForm } from '@/components/payments/payment-form';
import { notFound } from 'next/navigation';

export default async function NewPaymentPage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const invoices = await prisma.invoice.findMany({
        where: {
            organizationId: session.user.activeOrgId,
            status: { notIn: ['PAID', 'CANCELLED'] },
        },
        include: {
            customer: true,
            payments: true,
        },
        orderBy: { invoiceNumber: 'asc' },
    });

    const customers = await prisma.customer.findMany({
        where: { organizationId: session.user.activeOrgId, archived: false },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
                <p className="text-muted-foreground">Record a payment from a customer.</p>
            </div>
            <PaymentForm invoices={invoices} customers={customers} />
        </div>
    );
}