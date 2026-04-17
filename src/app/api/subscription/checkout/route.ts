import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { razorpay } from '@/lib/razorpay';
import { NextResponse } from 'next/server';

const PLANS: Record<string, any> = {
    PROFESSIONAL: {
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        razorpayPlanId: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID,
        name: 'Professional',
    },
    BUSINESS: {
        stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID,
        razorpayPlanId: process.env.RAZORPAY_BUSINESS_PLAN_ID,
        name: 'Business',
    },
};

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { plan, gateway } = await req.json(); // gateway: 'stripe' or 'razorpay'
        if (!plan || !PLANS[plan]) {
            return new NextResponse('Invalid plan', { status: 400 });
        }

        const orgId = session.user.activeOrgId;
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
        });

        // Get or create subscription
        let subscription = await prisma.subscription.findUnique({
            where: { organizationId: orgId },
        });

        if (!subscription) {
            subscription = await prisma.subscription.create({
                data: {
                    organizationId: orgId,
                    plan: 'FREE',
                    status: 'ACTIVE',
                    paymentGateway: gateway.toUpperCase(),
                },
            });
        }

        if (gateway === 'stripe') {
            // Stripe checkout flow
            let stripeCustomerId = subscription.stripeCustomerId;
            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    email: org?.email || session.user.email,
                    name: org?.name,
                    metadata: { organizationId: orgId },
                });
                stripeCustomerId = customer.id;
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { stripeCustomerId: customer.id, paymentGateway: 'STRIPE' },
                });
            }

            const checkoutSession = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                line_items: [{ price: PLANS[plan].stripePriceId, quantity: 1 }],
                mode: 'subscription',
                success_url: `${process.env.AUTH_URL}/dashboard/billing?success=true`,
                cancel_url: `${process.env.AUTH_URL}/dashboard/billing?canceled=true`,
                metadata: { organizationId: orgId, plan },
            });

            return NextResponse.json({ url: checkoutSession.url });
        } else {
            // Razorpay subscription flow
            // Create or get Razorpay customer
            let razorpayCustomerId = subscription.razorpayCustomerId;
            if (!razorpayCustomerId) {
                const customer = await razorpay.customers.create({
                    name: org?.name || session.user.name || 'Customer',
                    email: org?.email || session.user.email,
                    contact: org?.phone || '9999999999',
                    notes: { organizationId: orgId },
                });
                razorpayCustomerId = customer.id;
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { razorpayCustomerId: customer.id, paymentGateway: 'RAZORPAY' },
                });
            }

            // Create subscription
            const subscriptionPayload: any = {
                plan_id: PLANS[plan].razorpayPlanId,
                customer_id: razorpayCustomerId,
                total_count: 12, // 12 billing cycles (months)
                quantity: 1,
                notes: { organizationId: orgId, plan },
            };
            const razorpaySubscription = await razorpay.subscriptions.create(subscriptionPayload);

            // Save subscription ID
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: { razorpaySubscriptionId: razorpaySubscription.id },
            });

            // Return the subscription details for frontend to redirect or show link
            return NextResponse.json({
                subscriptionId: razorpaySubscription.id,
                shortUrl: razorpaySubscription.short_url,
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            });
        }
    } catch (error) {
        console.error('Checkout error:', error);
        return new NextResponse(
            error instanceof Error ? error.message : 'Internal server error',
            { status: 500 }
        );
    }
}