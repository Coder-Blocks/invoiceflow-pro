'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PlansListProps {
    plans: any[];
    currentPlan: string;
    orgCurrency: string;
}

export function PlansList({ plans, currentPlan, orgCurrency }: PlansListProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const router = useRouter();

    const handleUpgrade = async (plan: string, gateway: 'stripe' | 'razorpay') => {
        setLoadingPlan(plan);
        try {
            const res = await fetch('/api/subscription/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, gateway }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else if (data.shortUrl) {
                // Razorpay hosted page
                window.location.href = data.shortUrl;
            } else {
                toast.error('Failed to start checkout');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoadingPlan(null);
        }
    };

    // Determine which gateway to use based on org currency
    const defaultGateway = orgCurrency === 'INR' ? 'razorpay' : 'stripe';

    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Available Plans</h2>
            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = plan.name === currentPlan;
                    const features = plan.features as Record<string, any>;
                    return (
                        <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-3xl font-bold">
                                    {formatCurrency(plan.price, plan.currency)}
                                    <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        {features.maxCustomers} customers
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        {features.maxInvoicesPerMonth} invoices/month
                                    </li>
                                    {features.aiFeatures && (
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500" />
                                            AI-powered features
                                        </li>
                                    )}
                                    {features.reconciliation && (
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500" />
                                            Bank reconciliation
                                        </li>
                                    )}
                                </ul>
                                {!isCurrent && plan.name !== 'FREE' && (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleUpgrade(plan.name, defaultGateway)}
                                        disabled={loadingPlan === plan.name}
                                    >
                                        {loadingPlan === plan.name ? 'Redirecting...' : `Upgrade with ${defaultGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
                                    </Button>
                                )}
                                {isCurrent && (
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