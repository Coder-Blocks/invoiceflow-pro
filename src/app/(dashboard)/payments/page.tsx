import { Suspense } from 'react';
import { PaymentsTable } from '@/components/payments/payments-table';
import { PaymentsTableSkeleton } from '@/components/payments/payments-table-skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function PaymentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                    <p className="text-muted-foreground">
                        Record and manage customer payments.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/payments/new">
                        <Plus className="mr-2 h-4 w-4" /> Record Payment
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<PaymentsTableSkeleton />}>
                <PaymentsTable />
            </Suspense>
        </div>
    );
}