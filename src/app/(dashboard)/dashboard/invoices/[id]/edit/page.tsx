import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { notFound } from 'next/navigation';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({ where: { id, organizationId: session.user.activeOrgId }, include: { items: true } });
    if (!invoice) return notFound();

    const customers = await prisma.customer.findMany({ where: { organizationId: session.user.activeOrgId, archived: false }, orderBy: { name: 'asc' } });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Invoice</h1>
                <p className="text-muted-foreground">Update invoice details.</p>
            </div>
            <InvoiceForm initialData={invoice} customers={customers} />
        </div>
    );
}