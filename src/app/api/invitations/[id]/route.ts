import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId: session.user.activeOrgId,
            userId: session.user.id,
        },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await context.params;

    await prisma.invitation.delete({
        where: {
            id,
            organizationId: session.user.activeOrgId,
        },
    });

    return new NextResponse(null, { status: 204 });
}