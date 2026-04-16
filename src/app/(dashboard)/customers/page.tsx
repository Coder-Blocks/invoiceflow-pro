import { Suspense } from 'react';
import { CustomersTable } from '@/components/customers/customers-table';
import { CustomersTableSkeleton } from '@/components/customers/customers-table-skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground">
                        Manage your clients and view their transaction history.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/customers/new">
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<CustomersTableSkeleton />}>
                <CustomersTable />
            </Suspense>
        </div>
    );
}