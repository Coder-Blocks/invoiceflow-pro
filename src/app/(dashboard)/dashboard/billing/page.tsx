import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { BillingContent } from '@/components/billing/billing-content';
import { PlansList } from '@/components/billing/plans-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function BillingPage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const orgId = session.user.activeOrgId;

    const [organization, plans] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: orgId },
            include: { subscription: true },
        }),
        prisma.plan.findMany({
            where: { isActive: true },
            orderBy: [{ price: 'asc' }],
        }),
    ]);

    if (!organization) return notFound();

    let subscription = organization.subscription;

    if (!subscription) {
        subscription = await prisma.subscription.create({
            data: {
                organizationId: orgId,
                plan: 'FREE',
                status: 'ACTIVE',
                paymentGateway: organization.currency === 'INR' ? 'RAZORPAY' : 'STRIPE',
            },
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
                <p className="text-muted-foreground">
                    Manage your plan, payment methods, and subscription gateway.
                </p>
            </div>

            <BillingContent subscription={subscription} organization={organization} />

            <Card>
                <CardHeader>
                    <CardTitle>Available Plans</CardTitle>
                    <CardDescription>
                        Choose a plan and subscribe using Stripe or Razorpay.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlansList
                        plans={plans}
                        currentPlan={subscription.plan}
                        orgCurrency={organization.currency}
                        currentGateway={subscription.paymentGateway}
                    />
                </CardContent>
            </Card>
        </div>
    );
}