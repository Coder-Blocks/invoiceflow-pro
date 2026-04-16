import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ReconciliationSkeleton() {
    return (
        <div className="space-y-4">
            <Tabs defaultValue="unmatched">
                <TabsList>
                    <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
                    <TabsTrigger value="pending">Pending Matches</TabsTrigger>
                    <TabsTrigger value="matched">Matched</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="rounded-md border">
                <div className="p-4">
                    <Skeleton className="h-8 w-full mb-4" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full mb-2" />
                    ))}
                </div>
            </div>
        </div>
    );
}