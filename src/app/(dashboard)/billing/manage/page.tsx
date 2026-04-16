import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function ManageSubscriptionPage({
    searchParams,
}: {
    searchParams: { sub: string };
}) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const subscription = await prisma.subscription.findUnique({
        where: { id: searchParams.sub, organizationId: session.user.activeOrgId },
        include: { organization: true },
    });

    if (!subscription || subscription.paymentGateway !== 'RAZORPAY') {
        redirect('/dashboard/billing');
    }

    // Fetch subscription details from Razorpay
    const razorpay = require('razorpay');
    const instance = new razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    let razorpaySub;
    try {
        razorpaySub = await instance.subscriptions.fetch(subscription.razorpaySubscriptionId);
    } catch (error) {
        console.error('Failed to fetch Razorpay subscription', error);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Manage Subscription</h1>
                <p className="text-muted-foreground">
                    View and manage your Razorpay subscription.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscription Details</CardTitle>
                    <CardDescription>Your active subscription with Razorpay</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Plan</span>
                        <Badge variant="default">{subscription.plan}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Status</span>
                        <Badge variant={razorpaySub?.status === 'active' ? 'success' : 'warning'}>
                            {razorpaySub?.status || subscription.status}
                        </Badge>
                    </div>
                    {razorpaySub?.current_end && (
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Next Billing Date</span>
                            <span>{formatDate(new Date(razorpaySub.current_end * 1000))}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        To cancel your subscription, please contact support or manage directly on Razorpay.
                    </p>
                    <Button variant="destructive" disabled>
                        Cancel Subscription (Coming Soon)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}