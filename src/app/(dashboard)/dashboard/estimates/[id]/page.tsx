import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EstimateDetails } from '@/components/estimates/estimate-details';
import { Button } from '@/components/ui/button';
import { Pencil, Download, Send, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();
    const { id } = await params;

    const estimate = await prisma.estimate.findUnique({
        where: { id, organizationId: session.user.activeOrgId },
        include: { customer: true, items: true, organization: true },
    });
    if (!estimate) return notFound();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Estimate {estimate.estimateNumber}</h1>
                    <p className="text-muted-foreground">Created on {new Date(estimate.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild><Link href={`/api/estimates/${id}/pdf`} target="_blank"><Download className="mr-2 h-4 w-4" /> PDF</Link></Button>
                    <Button variant="outline" asChild><Link href={`/dashboard/estimates/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link></Button>
                    {estimate.status === 'DRAFT' && <Button><Send className="mr-2 h-4 w-4" /> Mark as Sent</Button>}
                    {(estimate.status === 'SENT' || estimate.status === 'ACCEPTED') && !estimate.convertedInvoiceId && (
                        <form action={`/api/estimates/${id}/convert`} method="POST"><Button type="submit"><RefreshCw className="mr-2 h-4 w-4" /> Convert to Invoice</Button></form>
                    )}
                </div>
            </div>
            <EstimateDetails estimate={estimate} />
        </div>
    );
}