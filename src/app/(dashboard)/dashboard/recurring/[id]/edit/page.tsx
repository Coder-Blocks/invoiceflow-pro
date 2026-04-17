import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RecurringForm } from '@/components/recurring/recurring-form';
import { notFound } from 'next/navigation';

export default async function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();
    const { id } = await params;

    const recurring = await prisma.recurringInvoice.findUnique({ where: { id, organizationId: session.user.activeOrgId } });
    if (!recurring) return notFound();

    const customers = await prisma.customer.findMany({ where: { organizationId: session.user.activeOrgId, archived: false }, orderBy: { name: 'asc' } });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Recurring Invoice</h1>
                <p className="text-muted-foreground">Update your recurring invoice settings.</p>
            </div>
            <RecurringForm initialData={recurring} customers={customers} />
        </div>
    );
}