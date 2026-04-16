import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    const unreadCount = await prisma.notification.count({
        where: { userId: session.user.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { id, read } = body;

    if (id) {
        await prisma.notification.update({
            where: { id, userId: session.user.id },
            data: { read },
        });
    } else if (read === true) {
        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true },
        });
    }

    return NextResponse.json({ success: true });
}