import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    await prisma.bankTransaction.delete({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
    });

    return new NextResponse(null, { status: 204 });
}