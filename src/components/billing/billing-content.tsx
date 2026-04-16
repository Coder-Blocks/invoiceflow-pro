'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

interface BillingContentProps {
    subscription: any;
}

export function BillingContent({ subscription }: BillingContentProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your active subscription details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Plan</span>
                        <Badge variant={subscription.plan === 'FREE' ? 'secondary' : 'default'}>
                            {subscription.plan}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Status</span>
                        <Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                            {subscription.status}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Payment Gateway</span>
                        <Badge variant="outline">{subscription.paymentGateway}</Badge>
                    </div>
                    {subscription.currentPeriodEnd && (
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Renews on</span>
                            <span>{formatDate(subscription.currentPeriodEnd)}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Manage your payment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <CreditCard className="h-5 w-5" />
                        <span>Payment method on file (via {subscription.paymentGateway})</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {subscription.plan === 'FREE'
                            ? 'Upgrade to a paid plan to add a payment method.'
                            : 'Manage your payment method in the customer portal.'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}