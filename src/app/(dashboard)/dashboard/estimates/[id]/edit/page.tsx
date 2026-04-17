import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EstimateForm } from '@/components/estimates/estimate-form';
import { notFound } from 'next/navigation';

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();
    const { id } = await params;

    const estimate = await prisma.estimate.findUnique({ where: { id, organizationId: session.user.activeOrgId }, include: { items: true } });
    if (!estimate) return notFound();

    const customers = await prisma.customer.findMany({ where: { organizationId: session.user.activeOrgId, archived: false }, orderBy: { name: 'asc' } });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Estimate</h1>
                <p className="text-muted-foreground">Update estimate details.</p>
            </div>
            <EstimateForm initialData={estimate} customers={customers} />
        </div>
    );
}