'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface PlansListProps { plans: any[]; currentPlan: string; orgCurrency: string; }

export function PlansList({ plans, currentPlan, orgCurrency }: PlansListProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>(orgCurrency === 'INR' ? 'razorpay' : 'stripe');

    const handleUpgrade = async (plan: string) => {
        setLoadingPlan(plan);
        try {
            const res = await fetch('/api/subscription/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, gateway: selectedGateway }) });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else if (data.shortUrl) window.location.href = data.shortUrl;
            else toast.error('Failed to start checkout');
        } catch { toast.error('Something went wrong'); }
        finally { setLoadingPlan(null); }
    };

    if (!plans?.length) return <div><h2 className="text-2xl font-bold tracking-tight mb-4">Available Plans</h2><p className="text-muted-foreground">No plans available.</p></div>;

    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Available Plans</h2>
            {currentPlan === 'FREE' && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Pay with:</span>
                    <Button variant={selectedGateway === 'razorpay' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedGateway('razorpay')}>Razorpay (₹)</Button>
                    <Button variant={selectedGateway === 'stripe' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedGateway('stripe')}>Stripe ($)</Button>
                </div>
            )}
            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = plan.name === currentPlan;
                    const features = plan.features as Record<string, any>;
                    return (
                        <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                            <CardHeader><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-3xl font-bold">{formatCurrency(plan.price, plan.currency)}<span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span></div>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />{features.maxCustomers} customers</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />{features.maxInvoicesPerMonth} invoices/month</li>
                                    {features.aiFeatures && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />AI-powered features</li>}
                                    {features.reconciliation && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Bank reconciliation</li>}
                                </ul>
                                {!isCurrent && plan.name !== 'FREE' && (
                                    <Button className="w-full" onClick={() => handleUpgrade(plan.name)} disabled={loadingPlan === plan.name}>
                                        {loadingPlan === plan.name ? 'Redirecting...' : `Upgrade with ${selectedGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
                                    </Button>
                                )}
                                {isCurrent && <Button className="w-full" variant="outline" disabled>Current Plan</Button>}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}