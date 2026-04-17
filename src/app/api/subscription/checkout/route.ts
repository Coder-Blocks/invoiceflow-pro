import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { razorpay } from '@/lib/razorpay';
import { NextResponse } from 'next/server';

type Gateway = 'stripe' | 'razorpay';
type PlanKey = 'PROFESSIONAL' | 'BUSINESS';

type PlanConfig = {
    name: string;
    stripePriceId?: string;
    razorpayPlanId?: string;
};

const PLANS: Record<PlanKey, PlanConfig> = {
    PROFESSIONAL: {
        name: 'Professional',
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        razorpayPlanId: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID,
    },
    BUSINESS: {
        name: 'Business',
        stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID,
        razorpayPlanId: process.env.RAZORPAY_BUSINESS_PLAN_ID,
    },
};

function isPlanKey(value: unknown): value is PlanKey {
    return value === 'PROFESSIONAL' || value === 'BUSINESS';
}

function isGateway(value: unknown): value is Gateway {
    return value === 'stripe' || value === 'razorpay';
}

function getBaseUrl() {
    return process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user || !session.user.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const plan = body?.plan;
        const gateway = body?.gateway;

        if (!isPlanKey(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        if (!isGateway(gateway)) {
            return NextResponse.json({ error: 'Invalid gateway' }, { status: 400 });
        }

        const orgId = session.user.activeOrgId;
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                currency: true,
            },
        });

        if (!org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

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

        const selectedPlan = PLANS[plan];
        const baseUrl = getBaseUrl();

        if (gateway === 'stripe') {
            if (!selectedPlan.stripePriceId) {
                return NextResponse.json(
                    { error: 'Stripe price id is missing in environment variables' },
                    { status: 400 }
                );
            }

            let stripeCustomerId = subscription.stripeCustomerId;

            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    email: org.email || session.user.email || undefined,
                    name: org.name || session.user.name || 'Customer',
                    metadata: {
                        organizationId: orgId,
                    },
                });

                stripeCustomerId = customer.id;

                subscription = await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        stripeCustomerId,
                        paymentGateway: 'STRIPE',
                    },
                });
            }

            if (!session || !session.user) {
                return new NextResponse('Unauthorized', { status: 401 });
            }

            const checkoutSession = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                line_items: [
                    {
                        price: selectedPlan.stripePriceId!,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${baseUrl}/dashboard/billing?success=true`,
                cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
                metadata: {
                    organizationId: orgId,
                    plan,
                    gateway: 'STRIPE',
                },
            });

        return NextResponse.json({
            url: checkoutSession.url ?? null,
        });
    }

    if (!selectedPlan.razorpayPlanId) {
        return NextResponse.json(
            { error: 'Razorpay plan id is missing in environment variables' },
            { status: 400 }
        );
    }

    let razorpayCustomerId = subscription.razorpayCustomerId;

    if (!razorpayCustomerId) {
        const customer = await razorpay.customers.create({
            name: org.name || session.user.name || 'Customer',
            email: org.email || session.user.email || undefined,
            contact: org.phone || '9999999999',
            notes: {
                organizationId: orgId,
            },
        });

        razorpayCustomerId = (customer as any).id;

        subscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                razorpayCustomerId,
                paymentGateway: 'RAZORPAY',
            },
        });
    }

    const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: selectedPlan.razorpayPlanId,
        customer_id: razorpayCustomerId!,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: {
            organizationId: orgId,
            plan,
            gateway: 'RAZORPAY',
        },
    } as any);

            const razorpayResult = razorpaySubscription as any;

    await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            razorpaySubscriptionId: razorpayResult.id,
        },
    });

    return NextResponse.json({
        subscriptionId: razorpayResult.id,
        shortUrl: razorpayResult.short_url ?? null,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
    });
} catch (error) {
    console.error('Checkout error:', error);

    return NextResponse.json(
        {
            error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
    );
}
}