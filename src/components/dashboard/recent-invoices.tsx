import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const statusVariants: Record<string, string> = {
    DRAFT: 'secondary',
    SENT: 'default',
    VIEWED: 'default',
    PARTIAL_PAID: 'warning',
    PAID: 'success',
    OVERDUE: 'destructive',
    CANCELLED: 'outline',
};

export async function RecentInvoices() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return null;

    const invoices = await prisma.invoice.findMany({
        where: { organizationId: session.user.activeOrgId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });

    return (
        <div className="space-y-4">
            {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No invoices yet.</p>
            ) : (
                invoices.map((invoice) => (
                    <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} className="block">
                        <div className="flex items-center hover:bg-muted/50 p-2 rounded-lg transition-colors">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>{getInitials(invoice.customer?.name || 'Customer')}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1 flex-1">
                                <p className="text-sm font-medium leading-none">
                                    {invoice.customer?.name || 'No Customer'}
                                </p>
                                <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-sm font-medium">{formatCurrency(invoice.total)}</p>
                                <Badge variant={statusVariants[invoice.status] as any} className="mt-1">
                                    {invoice.status}
                                </Badge>
                            </div>
                        </div>
                    </Link>
                ))
            )}
        </div>
    );
}