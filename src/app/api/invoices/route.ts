import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const invoiceItemSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
});

const invoiceSchema = z.object({
    customerId: z.string().optional().nullable(),
    poNumber: z.string().optional().nullable(),
    issueDate: z.string().datetime(),
    dueDate: z.string().datetime(),
    currency: z.string().default('USD'),
    items: z.array(invoiceItemSchema).min(1),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    footer: z.string().optional().nullable(),
    status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
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
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    if (status) {
        where.status = status;
    }

    const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
            where,
            include: {
                customer: true,
                items: true,
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
        invoices,
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
        const validated = invoiceSchema.parse({
            ...body,
            issueDate: new Date(body.issueDate).toISOString(),
            dueDate: new Date(body.dueDate).toISOString(),
        });

        // Generate invoice number (e.g., INV-20240001)
        const org = await prisma.organization.findUnique({
            where: { id: session.user.activeOrgId },
        });
        const prefix = org?.invoicePrefix || 'INV';
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({
            where: { organizationId: session.user.activeOrgId },
        });
        const invoiceNumber = `${prefix}-${year}${String(count + 1).padStart(4, '0')}`;

        // Calculate totals
        const items = validated.items.map(item => ({
            ...item,
            amount: item.quantity * item.unitPrice * (1 + item.taxRate / 100) - item.discount,
        }));
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
        const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
        const total = subtotal + taxTotal - discountTotal;

        const invoice = await prisma.invoice.create({
            data: {
                organizationId: session.user.activeOrgId,
                customerId: validated.customerId,
                invoiceNumber,
                poNumber: validated.poNumber,
                issueDate: new Date(validated.issueDate),
                dueDate: new Date(validated.dueDate),
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

        // Log audit
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'CREATE',
                entity: 'INVOICE',
                entityId: invoice.id,
            },
        });

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('Invoice creation error:', error);
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}