import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    triggerDays: z.number().int().optional(),
    isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    try {
        const { id } = await context.params;
        const body = await req.json();
        const validated = updateSchema.parse(body);
        const reminder = await prisma.reminder.update({ where: { id, organizationId: session.user.activeOrgId }, data: validated });
        return NextResponse.json(reminder);
    } catch (error) { if (error instanceof z.ZodError) return new NextResponse(error.errors[0].message, { status: 400 }); return new NextResponse('Internal server error', { status: 500 }); }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    const { id } = await context.params;
    await prisma.reminder.delete({ where: { id, organizationId: session.user.activeOrgId } });
    return new NextResponse(null, { status: 204 });
}