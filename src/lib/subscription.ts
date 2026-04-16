import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getCurrentSubscription() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return null;

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: session.user.activeOrgId },
        include: { organization: true },
    });

    if (!subscription) {
        return prisma.subscription.create({
            data: {
                organizationId: session.user.activeOrgId!,
                plan: 'FREE',
                status: 'ACTIVE',
            },
        });
    }

    return subscription;
}

export async function checkFeatureAccess(feature: string) {
    const subscription = await getCurrentSubscription();
    if (!subscription) return false;

    const plan = await prisma.plan.findUnique({
        where: { name: subscription.plan },
    });

    if (!plan) return false;
    const features = plan.features as Record<string, any>;
    return features[feature] === true;
}

export async function enforceSubscriptionLimit(entity: 'customers' | 'invoices') {
    const subscription = await getCurrentSubscription();
    if (!subscription) throw new Error('No subscription');

    const plan = await prisma.plan.findUnique({
        where: { name: subscription.plan },
    });
    if (!plan) throw new Error('Plan not found');

    const features = plan.features as Record<string, any>;
    const limit = features[`max${entity.charAt(0).toUpperCase() + entity.slice(1)}`];
    if (!limit) return; // No limit

    const count = await prisma[entity].count({
        where: { organizationId: subscription.organizationId },
    });

    if (count >= limit) {
        throw new Error(`You have reached the ${entity} limit for your plan. Please upgrade.`);
    }
}