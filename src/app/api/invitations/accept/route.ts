import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const acceptSchema = z.object({
    token: z.string(),
});

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { token } = acceptSchema.parse(body);

        const invitation = await prisma.invitation.findUnique({
            where: { token },
        });

        if (!invitation) {
            return new NextResponse('Invalid invitation', { status: 400 });
        }

        if (invitation.expires < new Date()) {
            return new NextResponse('Invitation expired', { status: 400 });
        }

        if (invitation.acceptedAt) {
            return new NextResponse('Invitation already accepted', { status: 400 });
        }

        // Check if user email matches invitation email
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (user?.email !== invitation.email) {
            return new NextResponse('This invitation is for a different email', { status: 403 });
        }

        // Check if already a member
        const existingMember = await prisma.organizationMember.findFirst({
            where: {
                organizationId: invitation.organizationId,
                userId: session.user.id,
            },
        });

        if (!existingMember) {
            // Add user to organization
            await prisma.organizationMember.create({
                data: {
                    organizationId: invitation.organizationId,
                    userId: session.user.id,
                    role: invitation.role,
                },
            });
        }

        // Mark invitation as accepted
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: invitation.organizationId,
                action: 'ACCEPT_INVITATION',
                entity: 'INVITATION',
                entityId: invitation.id,
            },
        });

        return NextResponse.json({ success: true, organizationId: invitation.organizationId });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}