import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.organizationId;
                const plan = session.metadata?.plan;
                const subscriptionId = session.subscription as string;

                if (orgId && plan && subscriptionId) {
                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            stripeSubscriptionId: subscriptionId,
                            plan,
                            status: 'ACTIVE',
                            currentPeriodStart: new Date(),
                            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Approx
                        },
                    });

                    await prisma.auditLog.create({
                        data: {
                            organizationId: orgId,
                            action: 'SUBSCRIPTION_CREATED',
                            entity: 'SUBSCRIPTION',
                            details: { plan, sessionId: session.id },
                        },
                    });
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = invoice.subscription as string;
                if (subscriptionId) {
                    const subscription = await prisma.subscription.findFirst({
                        where: { stripeSubscriptionId: subscriptionId },
                    });
                    if (subscription) {
                        await prisma.subscription.update({
                            where: { id: subscription.id },
                            data: {
                                status: 'ACTIVE',
                                currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
                            },
                        });
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const existing = await prisma.subscription.findFirst({
                    where: { stripeSubscriptionId: subscription.id },
                });
                if (existing) {
                    await prisma.subscription.update({
                        where: { id: existing.id },
                        data: {
                            status: 'CANCELED',
                            plan: 'FREE',
                        },
                    });
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return new NextResponse('Webhook processing failed', { status: 500 });
    }
}