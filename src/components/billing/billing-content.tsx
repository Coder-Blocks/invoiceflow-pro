'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface BillingContentProps {
    subscription: any;
    organization: any;
}

export function BillingContent({ subscription, organization }: BillingContentProps) {
    const [loading, setLoading] = useState(false);

    const openPortal = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/subscription/portal', { method: 'POST' });
            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Unable to open subscription portal');
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Current Subscription</CardTitle>
                    <CardDescription>Overview of your current plan and status.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="text-lg font-semibold">{subscription.plan}</p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant="secondary">{subscription.status}</Badge>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Gateway</p>
                        <p className="text-lg font-semibold">{subscription.paymentGateway || 'N/A'}</p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Billing Cycle</p>
                        <p className="text-lg font-semibold">
                            {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Accounts</CardTitle>
                    <CardDescription>
                        Connected billing accounts for this organization.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Stripe</p>
                                <p className="text-sm text-muted-foreground">
                                    Customer ID: {subscription.stripeCustomerId || 'Not connected'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Subscription ID: {subscription.stripeSubscriptionId || 'Not active'}
                                </p>
                            </div>
                            {subscription.paymentGateway === 'STRIPE' && subscription.stripeCustomerId ? (
                                <Button onClick={openPortal} disabled={loading}>
                                    {loading ? 'Opening...' : 'Manage Stripe'}
                                </Button>
                            ) : (
                                <Badge variant="outline">Inactive</Badge>
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Razorpay</p>
                                <p className="text-sm text-muted-foreground">
                                    Customer ID: {subscription.razorpayCustomerId || 'Not connected'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Subscription ID: {subscription.razorpaySubscriptionId || 'Not active'}
                                </p>
                            </div>
                            {subscription.paymentGateway === 'RAZORPAY' && subscription.razorpaySubscriptionId ? (
                                <Button onClick={openPortal} disabled={loading}>
                                    {loading ? 'Opening...' : 'Manage Razorpay'}
                                </Button>
                            ) : (
                                <Badge variant="outline">Inactive</Badge>
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        Organization: {organization.name} | Currency: {organization.currency}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}