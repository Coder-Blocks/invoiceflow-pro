import { Suspense } from 'react';
import { RecurringTable } from '@/components/recurring/recurring-table';
import { RecurringTableSkeleton } from '@/components/recurring/recurring-table-skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function RecurringPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Recurring Invoices</h1>
                    <p className="text-muted-foreground">
                        Set up invoices that generate automatically on a schedule.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/recurring/new">
                        <Plus className="mr-2 h-4 w-4" /> New Recurring Invoice
                    </Link>
                </Button>
            </div>
            <Suspense fallback={<RecurringTableSkeleton />}>
                <RecurringTable />
            </Suspense>
        </div>
    );
}