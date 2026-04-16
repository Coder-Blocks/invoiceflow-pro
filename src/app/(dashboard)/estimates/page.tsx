import { Suspense } from 'react';
import { EstimatesTable } from '@/components/estimates/estimates-table';
import { EstimatesTableSkeleton } from '@/components/estimates/estimates-table-skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function EstimatesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Estimates</h1>
                    <p className="text-muted-foreground">
                        Create and send estimates to your customers.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/estimates/new">
                        <Plus className="mr-2 h-4 w-4" /> New Estimate
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<EstimatesTableSkeleton />}>
                <EstimatesTable />
            </Suspense>
        </div>
    );
}