import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export function BillingContent({ subscription }: any) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                    Overview of your current plan and status.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Plan</span>
                        <div className="font-medium text-lg">{subscription.plan}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <div>
                            <Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                                {subscription.status}
                            </Badge>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Billing Cycle</span>
                        <div className="font-medium text-sm">
                            {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}