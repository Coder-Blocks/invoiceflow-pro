import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RecurringForm } from '@/components/recurring/recurring-form';
import { notFound } from 'next/navigation';

export default async function NewRecurringPage() {
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
                <h1 className="text-3xl font-bold tracking-tight">New Recurring Invoice</h1>
                <p className="text-muted-foreground">
                    Set up an invoice that generates automatically on a schedule.
                </p>
            </div>
            <RecurringForm customers={customers} />
        </div>
    );
}