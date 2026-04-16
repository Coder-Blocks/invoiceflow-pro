import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
    endDate: z.string().datetime().optional().nullable(),
    nextRunDate: z.string().datetime().optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = updateSchema.parse(body);

        const recurring = await prisma.recurringInvoice.update({
            where: {
                id: params.id,
                organizationId: session.user.activeOrgId,
            },
            data: {
                ...validated,
                endDate: validated.endDate ? new Date(validated.endDate) : undefined,
                nextRunDate: validated.nextRunDate ? new Date(validated.nextRunDate) : undefined,
            },
        });

        return NextResponse.json(recurring);
    } catch (error) {
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    await prisma.recurringInvoice.delete({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
    });

    return new NextResponse(null, { status: 204 });
}