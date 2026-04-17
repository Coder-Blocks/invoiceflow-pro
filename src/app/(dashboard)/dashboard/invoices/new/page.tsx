import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { notFound } from 'next/navigation';

export default async function NewInvoicePage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const customers = await prisma.customer.findMany({
        where: {
            organizationId: session.user.activeOrgId,
            archived: false,
        },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">New Invoice</h1>
                <p className="text-muted-foreground">
                    Create a new invoice for your customer.
                </p>
            </div>

            <InvoiceForm customers={customers} />
        </div>
    );
}