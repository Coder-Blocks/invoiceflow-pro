import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EstimateForm } from '@/components/estimates/estimate-form';
import { notFound } from 'next/navigation';

export default async function NewEstimatePage() {
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
                <h1 className="text-3xl font-bold tracking-tight">New Estimate</h1>
                <p className="text-muted-foreground">Create a new estimate for your customer.</p>
            </div>
            <EstimateForm customers={customers} />
        </div>
    );
}