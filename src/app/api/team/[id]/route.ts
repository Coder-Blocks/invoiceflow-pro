import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({ role: z.enum(['OWNER', 'ADMIN', 'ACCOUNTANT', 'STAFF']) });

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    const currentMember = await prisma.organizationMember.findFirst({ where: { organizationId: session.user.activeOrgId, userId: session.user.id } });
    if (!currentMember || currentMember.role !== 'OWNER') return new NextResponse('Forbidden: Only owner can change roles', { status: 403 });
    try {
        const { id } = await context.params;
        const body = await req.json();
        const { role } = updateSchema.parse(body);
        const targetMember = await prisma.organizationMember.findFirst({ where: { id, organizationId: session.user.activeOrgId }, include: { user: true } });
        if (!targetMember) return new NextResponse('Member not found', { status: 404 });
        if (targetMember.role === 'OWNER' && role !== 'OWNER') {
            const ownerCount = await prisma.organizationMember.count({ where: { organizationId: session.user.activeOrgId, role: 'OWNER' } });
            if (ownerCount <= 1) return new NextResponse('Cannot remove the last owner', { status: 400 });
        }
        const updated = await prisma.organizationMember.update({ where: { id }, data: { role } });
        await prisma.auditLog.create({ data: { userId: session.user.id, organizationId: session.user.activeOrgId, action: 'UPDATE_ROLE', entity: 'TEAM_MEMBER', entityId: targetMember.userId, details: { newRole: role, previousRole: targetMember.role } } });
        return NextResponse.json(updated);
    } catch (error) { if (error instanceof z.ZodError) return new NextResponse(error.errors[0].message, { status: 400 }); return new NextResponse('Internal server error', { status: 500 }); }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    const { id } = await context.params;
    const currentMember = await prisma.organizationMember.findFirst({ where: { organizationId: session.user.activeOrgId, userId: session.user.id } });
    const targetMember = await prisma.organizationMember.findFirst({ where: { id, organizationId: session.user.activeOrgId }, include: { user: true } });
    if (!targetMember) return new NextResponse('Member not found', { status: 404 });
    const isSelf = targetMember.userId === session.user.id;
    if (!isSelf && currentMember?.role !== 'OWNER') return new NextResponse('Forbidden', { status: 403 });
    if (targetMember.role === 'OWNER') {
        const ownerCount = await prisma.organizationMember.count({ where: { organizationId: session.user.activeOrgId, role: 'OWNER' } });
        if (ownerCount <= 1) return new NextResponse('Cannot remove the last owner', { status: 400 });
    }
    await prisma.organizationMember.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: session.user.id, organizationId: session.user.activeOrgId, action: 'REMOVE_MEMBER', entity: 'TEAM_MEMBER', entityId: targetMember.userId, details: { removedEmail: targetMember.user.email } } });
    return new NextResponse(null, { status: 204 });
}