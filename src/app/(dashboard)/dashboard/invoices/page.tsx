import { Suspense } from 'react';
import { InvoicesTable } from '@/components/invoices/invoices-table';
import { InvoicesTableSkeleton } from '@/components/invoices/invoices-table-skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground">
                        Create, send, and track your invoices.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/invoices/new">
                        <Plus className="mr-2 h-4 w-4" /> New Invoice
                    </Link>
                </Button>
            </div>
            <Suspense fallback={<InvoicesTableSkeleton />}>
                <InvoicesTable />
            </Suspense>
        </div>
    );
}