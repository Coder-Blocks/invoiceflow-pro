import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const customerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    billingAddress: z.any().optional(),
    taxId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = {
        organizationId: session.user.activeOrgId,
        archived: false,
        OR: search
            ? [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
            ]
            : undefined,
    };

    const [customers, total] = await Promise.all([
        prisma.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                _count: { select: { invoices: true } },
            },
        }),
        prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
        customers,
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
        const validated = customerSchema.parse(body);

        const customer = await prisma.customer.create({
            data: {
                ...validated,
                organizationId: session.user.activeOrgId,
            },
        });

        return NextResponse.json(customer);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}