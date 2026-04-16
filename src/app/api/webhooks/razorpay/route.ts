import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(body)
        .digest('hex');

    if (signature !== expectedSignature) {
        return new NextResponse('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);

    try {
        switch (event.event) {
            case 'subscription.charged': {
                const subscriptionEntity = event.payload.subscription.entity;
                const subscription = await prisma.subscription.findFirst({
                    where: { razorpaySubscriptionId: subscriptionEntity.id },
                });

                if (subscription) {
                    // Update period
                    await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: {
                            status: 'ACTIVE',
                            currentPeriodStart: new Date(subscriptionEntity.current_start * 1000),
                            currentPeriodEnd: new Date(subscriptionEntity.current_end * 1000),
                        },
                    });

                    // Create audit log
                    await prisma.auditLog.create({
                        data: {
                            organizationId: subscription.organizationId,
                            action: 'SUBSCRIPTION_CHARGED',
                            entity: 'SUBSCRIPTION',
                            entityId: subscription.id,
                            details: { gateway: 'RAZORPAY', amount: subscriptionEntity.amount },
                        },
                    });
                }
                break;
            }

            case 'subscription.cancelled': {
                const subscriptionEntity = event.payload.subscription.entity;
                const subscription = await prisma.subscription.findFirst({
                    where: { razorpaySubscriptionId: subscriptionEntity.id },
                });

                if (subscription) {
                    await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { status: 'CANCELED', plan: 'FREE' },
                    });
                }
                break;
            }

            default:
                console.log('Unhandled Razorpay event:', event.event);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        return new NextResponse('Webhook processing failed', { status: 500 });
    }
}