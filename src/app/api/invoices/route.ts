import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const invoiceItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unitPrice: z.number().min(0, 'Unit price cannot be negative'),
    taxRate: z.number().min(0).optional().default(0),
    discount: z.number().min(0).optional().default(0),
});

const invoiceSchema = z.object({
    customerId: z.string().optional().nullable(),
    poNumber: z.string().optional().nullable(),
    issueDate: z.string().min(1, 'Issue date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.string().optional().default('INR'),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    footer: z.string().optional().nullable(),
    status: z
        .enum([
            'DRAFT',
            'SENT',
            'VIEWED',
            'PARTIAL_PAID',
            'PAID',
            'OVERDUE',
            'CANCELLED',
        ])
        .optional()
        .default('DRAFT'),
});

function parseFlexibleDate(input: string, fieldName: string): Date {
    if (!input || typeof input !== 'string') {
        throw new Error(`${fieldName} is required`);
    }

    const trimmed = input.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const date = new Date(`${trimmed}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`Invalid ${fieldName.toLowerCase()}`);
        }
        return date;
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName.toLowerCase()}`);
    }

    return date;
}

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        organizationId: session.user.activeOrgId,
    };

    if (search) {
        where.OR = [
            {
                invoiceNumber: {
                    contains: search,
                    mode: 'insensitive',
                },
            },
            {
                customer: {
                    name: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
            },
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
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = invoiceSchema.parse(body);

        const issueDate = parseFlexibleDate(validated.issueDate, 'Issue date');
        const dueDate = parseFlexibleDate(validated.dueDate, 'Due date');

        const org = await prisma.organization.findUnique({
            where: { id: session.user.activeOrgId },
            select: {
                id: true,
                currency: true,
                invoicePrefix: true,
                settings: {
                    select: {
                        defaultTaxRate: true,
                        defaultNotes: true,
                        defaultTerms: true,
                        defaultFooter: true,
                    },
                },
            },
        });

        if (!org) {
            return new NextResponse('Organization not found', { status: 404 });
        }

        const count = await prisma.invoice.count({
            where: { organizationId: session.user.activeOrgId },
        });

        const prefix = org.invoicePrefix || 'INV';
        const year = new Date().getFullYear();
        const invoiceNumber = `${prefix}-${year}${String(count + 1).padStart(4, '0')}`;

        const effectiveTaxRate = org.settings?.defaultTaxRate ?? 0;

        const items = validated.items.map((item) => {
            const taxRate =
                item.taxRate && item.taxRate > 0 ? item.taxRate : effectiveTaxRate;

            const quantity = item.quantity;
            const unitPrice = item.unitPrice;
            const discount = item.discount ?? 0;

            const lineSubtotal = quantity * unitPrice;
            const lineTax = (lineSubtotal * taxRate) / 100;
            const amount = lineSubtotal + lineTax - discount;

            return {
                description: item.description,
                quantity,
                unitPrice,
                taxRate,
                discount,
                amount,
            };
        });

        const subtotal = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );

        const taxTotal = items.reduce(
            (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
            0
        );

        const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
        const total = subtotal + taxTotal - discountTotal;

        const invoice = await prisma.invoice.create({
            data: {
                organizationId: session.user.activeOrgId,
                customerId: validated.customerId ?? null,
                invoiceNumber,
                poNumber: validated.poNumber ?? null,
                issueDate,
                dueDate,
                currency: validated.currency || org.currency || 'INR',
                status: validated.status,
                subtotal,
                taxTotal,
                discountTotal,
                total,
                notes:
                    validated.notes && validated.notes.trim().length > 0
                        ? validated.notes
                        : org.settings?.defaultNotes ?? null,
                terms:
                    validated.terms && validated.terms.trim().length > 0
                        ? validated.terms
                        : org.settings?.defaultTerms ?? null,
                footer:
                    validated.footer && validated.footer.trim().length > 0
                        ? validated.footer
                        : org.settings?.defaultFooter ?? null,
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
                entity: 'INVOICE',
                entityId: invoice.id,
            },
        });

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('Invoice creation error:', error);

        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0]?.message || 'Invalid input', {
                status: 400,
            });
        }

        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 });
        }

        return new NextResponse('Internal server error', { status: 500 });
    }
}