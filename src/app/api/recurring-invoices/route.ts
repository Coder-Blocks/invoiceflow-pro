import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const recurringInvoiceSchema = z.object({
    customerId: z.string().min(1),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().int().positive().default(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional().nullable(),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
    invoiceData: z.object({
        items: z.array(z.object({
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            taxRate: z.number().default(0),
            discount: z.number().default(0),
        })),
        currency: z.string().default('USD'),
        notes: z.string().optional(),
        terms: z.string().optional(),
        footer: z.string().optional(),
    }),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const recurring = await prisma.recurringInvoice.findMany({
        where: { organizationId: session.user.activeOrgId },
        include: {
            customer: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(recurring);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = recurringInvoiceSchema.parse(body);

        const startDate = new Date(validated.startDate);
        let nextRunDate = new Date(startDate);
        const now = new Date();

        // Calculate next run date based on frequency and interval
        while (nextRunDate < now) {
            switch (validated.frequency) {
                case 'DAILY':
                    nextRunDate.setDate(nextRunDate.getDate() + validated.interval);
                    break;
                case 'WEEKLY':
                    nextRunDate.setDate(nextRunDate.getDate() + (7 * validated.interval));
                    break;
                case 'MONTHLY':
                    nextRunDate.setMonth(nextRunDate.getMonth() + validated.interval);
                    break;
                case 'YEARLY':
                    nextRunDate.setFullYear(nextRunDate.getFullYear() + validated.interval);
                    break;
            }
        }

        const recurring = await prisma.recurringInvoice.create({
            data: {
                organizationId: session.user.activeOrgId,
                customerId: validated.customerId,
                frequency: validated.frequency,
                interval: validated.interval,
                startDate: startDate,
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                nextRunDate: nextRunDate,
                status: validated.status,
                invoiceData: validated.invoiceData,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'CREATE',
                entity: 'RECURRING_INVOICE',
                entityId: recurring.id,
            },
        });

        return NextResponse.json(recurring);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}