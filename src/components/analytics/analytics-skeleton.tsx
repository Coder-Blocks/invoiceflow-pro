import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsSkeletonProps {
    type: 'chart' | 'table';
}

export function AnalyticsSkeleton({ type }: AnalyticsSkeletonProps) {
    if (type === 'chart') {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
            ))}
        </div>
    );
}