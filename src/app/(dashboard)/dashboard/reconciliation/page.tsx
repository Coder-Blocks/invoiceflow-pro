import { Suspense } from 'react';
import { ReconciliationTabs } from '@/components/reconciliation/reconciliation-tabs';
import { ReconciliationSkeleton } from '@/components/reconciliation/reconciliation-skeleton';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import Link from 'next/link';

export default function ReconciliationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reconciliation</h1>
                    <p className="text-muted-foreground">
                        Import bank statements and match transactions with invoices.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/reconciliation/import">
                        <Upload className="mr-2 h-4 w-4" /> Import CSV
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<ReconciliationSkeleton />}>
                <ReconciliationTabs />
            </Suspense>
        </div>
    );
}