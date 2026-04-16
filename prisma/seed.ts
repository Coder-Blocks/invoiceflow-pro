import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default plans
    const plans = [
        {
            name: 'FREE',
            description: 'For freelancers and micro businesses',
            price: 0,
            currency: 'USD',
            interval: 'month',
            features: {
                maxUsers: 1,
                maxCustomers: 50,
                maxInvoicesPerMonth: 25,
                aiFeatures: false,
                reconciliation: false,
            },
        },
        {
            name: 'PROFESSIONAL',
            description: 'For growing small businesses',
            price: 39,
            currency: 'USD',
            interval: 'month',
            features: {
                maxUsers: 5,
                maxCustomers: 500,
                maxInvoicesPerMonth: 500,
                aiFeatures: true,
                reconciliation: true,
            },
        },
        {
            name: 'BUSINESS',
            description: 'For established businesses',
            price: 79,
            currency: 'USD',
            interval: 'month',
            features: {
                maxUsers: 15,
                maxCustomers: 2000,
                maxInvoicesPerMonth: 2000,
                aiFeatures: true,
                reconciliation: true,
                prioritySupport: true,
            },
        },
    ];

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { name: plan.name },
            update: {},
            create: plan,
        });
    }
    console.log('✅ Plans seeded');

    // Create demo user and organization if not exists
    const demoEmail = 'demo@invoiceflow.pro';
    const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } });

    if (!existingUser) {
        const hashedPassword = await hash('demo123456', 12);
        const user = await prisma.user.create({
            data: {
                name: 'Demo User',
                email: demoEmail,
                password: hashedPassword,
                emailVerified: new Date(),
            },
        });

        const org = await prisma.organization.create({
            data: {
                name: 'Acme Inc.',
                slug: 'acme-demo',
                email: 'billing@acme.com',
                phone: '+1 (555) 123-4567',
                address: '123 Business Ave, Suite 100, San Francisco, CA 94107',
                taxId: 'US123456789',
                currency: 'USD',
                timezone: 'America/Los_Angeles',
                invoicePrefix: 'INV',
                brandColor: '#3B82F6',
                ownerId: user.id,
                members: {
                    create: {
                        userId: user.id,
                        role: 'OWNER',
                    },
                },
            },
        });

        // Create subscription for demo org
        await prisma.subscription.create({
            data: {
                organizationId: org.id,
                plan: 'PROFESSIONAL',
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        // Create sample customers
        const customers = [
            { name: 'TechCorp Solutions', email: 'ap@techcorp.com', phone: '+1 (555) 111-2222' },
            { name: 'Green Earth Cafe', email: 'manager@greenearthcafe.com', phone: '+1 (555) 222-3333' },
            { name: 'Smith & Associates Law', email: 'billing@smithlaw.com', phone: '+1 (555) 333-4444' },
            { name: 'Creative Design Studio', email: 'accounts@creativedesign.io', phone: '+1 (555) 444-5555' },
        ];

        for (const cust of customers) {
            await prisma.customer.create({
                data: {
                    organizationId: org.id,
                    name: cust.name,
                    email: cust.email,
                    phone: cust.phone,
                    billingAddress: {
                        street: '123 Main St',
                        city: 'San Francisco',
                        state: 'CA',
                        zip: '94105',
                        country: 'USA',
                    },
                },
            });
        }

        console.log(`✅ Demo user created: ${demoEmail} / demo123456`);
        console.log(`✅ Demo organization: ${org.name} (${org.id})`);
    }

    console.log('🎉 Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });