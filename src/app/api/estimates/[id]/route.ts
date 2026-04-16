import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    customerId: z.string().optional().nullable(),
    issueDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional().nullable(),
    status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED']).optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    footer: z.string().optional().nullable(),
});

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const estimate = await prisma.estimate.findUnique({
        where: {
            id,
            organizationId: session.user.activeOrgId,
        },
        include: {
            customer: true,
            items: true,
            organization: true,
        },
    });

    if (!estimate) {
        return new NextResponse('Estimate not found', { status: 404 });
    }

    return NextResponse.json(estimate);
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { id } = await context.params;
        const body = await req.json();
        const validated = updateSchema.parse(body);

        const estimate = await prisma.estimate.update({
            where: { id, organizationId: session.user.activeOrgId },
            data: {
                ...validated,
                issueDate: validated.issueDate ? new Date(validated.issueDate) : undefined,
                expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : undefined,
                sentAt: validated.status === 'SENT' ? new Date() : undefined,
                acceptedAt: validated.status === 'ACCEPTED' ? new Date() : undefined,
                rejectedAt: validated.status === 'REJECTED' ? new Date() : undefined,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'UPDATE',
                entity: 'ESTIMATE',
                entityId: estimate.id,
                details: { changes: validated },
            },
        });

        return NextResponse.json(estimate);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const estimate = await prisma.estimate.findUnique({
        where: { id, organizationId: session.user.activeOrgId },
    });

    if (!estimate) {
        return new NextResponse('Estimate not found', { status: 404 });
    }

    if (estimate.status !== 'DRAFT') {
        return new NextResponse('Only draft estimates can be deleted', { status: 400 });
    }

    await prisma.estimate.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
}