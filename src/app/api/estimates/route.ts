import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const estimateItemSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
});

const estimateSchema = z.object({
    customerId: z.string().optional().nullable(),
    issueDate: z.string().datetime(),
    expiryDate: z.string().datetime().optional().nullable(),
    currency: z.string().default('USD'),
    items: z.array(estimateItemSchema).min(1),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    footer: z.string().optional().nullable(),
    status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED']).default('DRAFT'),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {
        organizationId: session.user.activeOrgId,
    };

    if (search) {
        where.OR = [
            { estimateNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    if (status) {
        where.status = status;
    }

    const [estimates, total] = await Promise.all([
        prisma.estimate.findMany({
            where,
            include: {
                customer: true,
                items: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.estimate.count({ where }),
    ]);

    return NextResponse.json({
        estimates,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = estimateSchema.parse(body);

        // Generate estimate number (e.g., EST-20240001)
        const org = await prisma.organization.findUnique({
            where: { id: session.user.activeOrgId },
        });
        const prefix = 'EST';
        const year = new Date().getFullYear();
        const count = await prisma.estimate.count({
            where: { organizationId: session.user.activeOrgId },
        });
        const estimateNumber = `${prefix}-${year}${String(count + 1).padStart(4, '0')}`;

        // Calculate totals
        const items = validated.items.map(item => ({
            ...item,
            amount: item.quantity * item.unitPrice * (1 + item.taxRate / 100) - item.discount,
        }));
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
        const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
        const total = subtotal + taxTotal - discountTotal;

        const estimate = await prisma.estimate.create({
            data: {
                organizationId: session.user.activeOrgId,
                customerId: validated.customerId,
                estimateNumber,
                issueDate: new Date(validated.issueDate),
                expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
                currency: validated.currency,
                status: validated.status,
                subtotal,
                taxTotal,
                discountTotal,
                total,
                notes: validated.notes,
                terms: validated.terms,
                footer: validated.footer,
                items: {
                    create: items,
                },
            },
            include: {
                customer: true,
                items: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'CREATE',
                entity: 'ESTIMATE',
                entityId: estimate.id,
            },
        });

        return NextResponse.json(estimate);
    } catch (error) {
        console.error('Estimate creation error:', error);
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}