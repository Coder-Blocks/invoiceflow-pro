import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CustomerForm } from '@/components/customers/customer-form';

export default async function EditCustomerPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const customer = await prisma.customer.findUnique({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
    });

    if (!customer) return notFound();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Customer</h1>
                <p className="text-muted-foreground">Update client information.</p>
            </div>
            <CustomerForm initialData={customer} />
        </div>
    );
}