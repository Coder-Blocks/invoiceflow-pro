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

    const { id } = await context.params;

    await prisma.bankTransaction.delete({
        where: {
            id,
            organizationId: session.user.activeOrgId,
        },
    });

    return new NextResponse(null, { status: 204 });
}