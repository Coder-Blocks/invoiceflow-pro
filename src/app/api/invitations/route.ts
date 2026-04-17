import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const invitationSchema = z.object({
    email: z.string().email(),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'STAFF']),
});

export async function GET() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: session.user.activeOrgId, userId: session.user.id },
    });
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN'))
        return new NextResponse('Forbidden', { status: 403 });

    const invitations = await prisma.invitation.findMany({
        where: { organizationId: session.user.activeOrgId, acceptedAt: null },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(invitations);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return new NextResponse('Unauthorized', { status: 401 });
    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: session.user.activeOrgId, userId: session.user.id },
    });
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN'))
        return new NextResponse('Forbidden', { status: 403 });

    try {
        const body = await req.json();
        const validated = invitationSchema.parse(body);

        const existingMember = await prisma.organizationMember.findFirst({
            where: { organizationId: session.user.activeOrgId, user: { email: validated.email } },
        });
        if (existingMember) return new NextResponse('User is already a member', { status: 400 });

        const existingInvitation = await prisma.invitation.findFirst({
            where: { organizationId: session.user.activeOrgId, email: validated.email, acceptedAt: null },
        });
        if (existingInvitation) return new NextResponse('Invitation already sent', { status: 400 });

        const token = randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invitation = await prisma.invitation.create({
            data: {
                organizationId: session.user.activeOrgId,
                email: validated.email,
                role: validated.role,
                token,
                expires,
            },
        });

        // Email sending temporarily disabled
        console.log(`Invitation link: ${process.env.AUTH_URL}/invite/${token}`);

        return NextResponse.json(invitation);
    } catch (error) {
        if (error instanceof z.ZodError) return new NextResponse(error.errors[0].message, { status: 400 });
        return new NextResponse('Internal server error', { status: 500 });
    }
}