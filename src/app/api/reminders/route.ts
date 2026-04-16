import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const reminderSchema = z.object({
    name: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    triggerDays: z.number().int(),
    isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const reminders = await prisma.reminder.findMany({
        where: { organizationId: session.user.activeOrgId },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reminders);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = reminderSchema.parse(body);

        const reminder = await prisma.reminder.create({
            data: {
                organizationId: session.user.activeOrgId,
                ...validated,
            },
        });

        return NextResponse.json(reminder);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}