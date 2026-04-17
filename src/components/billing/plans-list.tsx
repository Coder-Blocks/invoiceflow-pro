'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface PlansListProps {
    plans: any[];
    currentPlan: string;
    orgCurrency: string;
    currentGateway: string;
}

export function PlansList({
    plans,
    currentPlan,
    orgCurrency,
    currentGateway,
}: PlansListProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>(
        currentGateway === 'RAZORPAY' || orgCurrency === 'INR' ? 'razorpay' : 'stripe'
    );

    const handleUpgrade = async (plan: string) => {
        try {
            setLoadingPlan(plan);

            const res = await fetch('/api/subscription/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, gateway: selectedGateway }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || data?.message || 'Failed to start checkout');
                return;
            }

            if (data.url) {
                window.location.href = data.url;
                return;
            }

            if (data.shortUrl) {
                window.location.href = data.shortUrl;
                return;
            }

            toast.error('Checkout link not received');
        } catch {
            toast.error('Something went wrong');
        } finally {
            setLoadingPlan(null);
        }
    };

    if (!plans?.length) {
        return <p className="text-sm text-muted-foreground">No plans available.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Pay with:</span>
                <Button
                    type="button"
                    variant={selectedGateway === 'razorpay' ? 'default' : 'outline'}
                    onClick={() => setSelectedGateway('razorpay')}
                >
                    Razorpay
                </Button>
                <Button
                    type="button"
                    variant={selectedGateway === 'stripe' ? 'default' : 'outline'}
                    onClick={() => setSelectedGateway('stripe')}
                >
                    Stripe
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = plan.name === currentPlan;
                    const features = (plan.features || {}) as Record<string, any>;

                    return (
                        <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{plan.name}</CardTitle>
                                    {isCurrent ? <Badge>Current</Badge> : null}
                                </div>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="text-2xl font-bold">
                                    {formatCurrency(plan.price, plan.currency)}/{plan.interval}
                                </div>

                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        {features.maxCustomers ?? 'Unlimited'} customers
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        {features.maxInvoicesPerMonth ?? 'Unlimited'} invoices/month
                                    </li>
                                    {features.aiFeatures ? (
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4" />
                                            AI-powered features
                                        </li>
                                    ) : null}
                                    {features.reconciliation ? (
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4" />
                                            Bank reconciliation
                                        </li>
                                    ) : null}
                                    {features.prioritySupport ? (
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4" />
                                            Priority support
                                        </li>
                                    ) : null}
                                </ul>

                                {!isCurrent ? (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleUpgrade(plan.name)}
                                        disabled={loadingPlan === plan.name || plan.name === 'FREE'}
                                    >
                                        {loadingPlan === plan.name
                                            ? 'Redirecting...'
                                            : plan.name === 'FREE'
                                                ? 'Current Free Plan'
                                                : `Upgrade with ${selectedGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="outline" disabled>
                                        Current Plan
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}