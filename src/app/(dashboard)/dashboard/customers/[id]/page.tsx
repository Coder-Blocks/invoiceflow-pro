import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CustomerDetails } from '@/components/customers/customer-details';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import Link from 'next/link';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
        where: { id, organizationId: session.user.activeOrgId },
        include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 }, payments: { orderBy: { paymentDate: 'desc' }, take: 10 }, _count: { select: { invoices: true } } },
    });
    if (!customer) return notFound();

    const invoicesTotal = await prisma.invoice.aggregate({ where: { customerId: id, organizationId: session.user.activeOrgId }, _sum: { total: true } });
    const paymentsTotal = await prisma.payment.aggregate({ where: { customerId: id, organizationId: session.user.activeOrgId }, _sum: { amount: true } });
    const outstanding = (invoicesTotal._sum.total || 0) - (paymentsTotal._sum.amount || 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
                    <p className="text-muted-foreground">{customer.email || 'No email'}</p>
                </div>
                <Button asChild variant="outline">
                    <Link href={`/dashboard/customers/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit Customer</Link>
                </Button>
            </div>
            <CustomerDetails customer={customer} outstanding={outstanding} invoicesTotal={invoicesTotal._sum.total || 0} paymentsTotal={paymentsTotal._sum.amount || 0} />
        </div>
    );
}