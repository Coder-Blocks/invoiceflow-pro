import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const orgId = session.user.activeOrgId;
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
    });

    if (!subscription) {
        return new NextResponse('No subscription found', { status: 400 });
    }

    try {
        if (subscription.paymentGateway === 'STRIPE' && subscription.stripeCustomerId) {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: subscription.stripeCustomerId,
                return_url: `${process.env.AUTH_URL}/dashboard/billing`,
            });
            return NextResponse.json({ url: portalSession.url });
        } else if (subscription.paymentGateway === 'RAZORPAY' && subscription.razorpaySubscriptionId) {
            // Razorpay doesn't have a hosted portal like Stripe. Redirect to a custom management page.
            return NextResponse.json({
                url: `/dashboard/billing/manage?sub=${subscription.id}`,
            });
        } else {
            return NextResponse.json({ url: `/dashboard/billing` });
        }
    } catch (error) {
        console.error('Portal error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}