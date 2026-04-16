import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { InvoiceDetails } from '@/components/invoices/invoice-details';
import { Button } from '@/components/ui/button';
import { Pencil, Download, Send } from 'lucide-react';
import Link from 'next/link';

export default async function InvoiceDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const invoice = await prisma.invoice.findUnique({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
        include: {
            customer: true,
            items: true,
            payments: true,
            organization: true,
        },
    });

    if (!invoice) return notFound();

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = invoice.total - paidAmount;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Invoice {invoice.invoiceNumber}
                    </h1>
                    <p className="text-muted-foreground">
                        Created on {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/api/invoices/${params.id}/pdf`} target="_blank">
                            <Download className="mr-2 h-4 w-4" /> PDF
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/invoices/${params.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                    {invoice.status === 'DRAFT' && (
                        <Button>
                            <Send className="mr-2 h-4 w-4" /> Mark as Sent
                        </Button>
                    )}
                </div>
            </div>

            <InvoiceDetails invoice={invoice} paidAmount={paidAmount} balanceDue={balanceDue} />
        </div>
    );
}