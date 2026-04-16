import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { BillingContent } from '@/components/billing/billing-content';
import { PlansList } from '@/components/billing/plans-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function BillingPage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const orgId = session.user.activeOrgId;

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
        include: { organization: true },
    });

    const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
    });

    let currentSubscription = subscription;
    if (!currentSubscription) {
        currentSubscription = await prisma.subscription.create({
            data: {
                organizationId: orgId,
                plan: 'FREE',
                status: 'ACTIVE',
                paymentGateway: 'STRIPE',
            },
            include: { organization: true },
        });
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
                <p className="text-muted-foreground">
                    Manage your plan, payment methods, and view invoices.
                </p>
            </div>

            <BillingContent subscription={currentSubscription} />
            <PlansList
                plans={plans}
                currentPlan={currentSubscription.plan}
                orgCurrency={currentSubscription.organization.currency}
            />

            {currentSubscription.plan !== 'FREE' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Methods & History</CardTitle>
                        <CardDescription>
                            {currentSubscription.paymentGateway === 'STRIPE'
                                ? 'Manage your saved cards and view past invoices.'
                                : 'Manage your Razorpay subscription and payment methods.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action="/api/subscription/portal" method="POST">
                            <Button type="submit" variant="outline">
                                Open Customer Portal ({currentSubscription.paymentGateway})
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}