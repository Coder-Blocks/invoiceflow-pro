import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const invitationSchema = z.object({
    email: z.string().email('Valid email is required'),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'STAFF']),
});

const resend =
    process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
        ? new Resend(process.env.RESEND_API_KEY)
        : null;

function getBaseUrl() {
    return (
        process.env.AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000'
    );
}

export async function GET() {
    const session = await auth();

    if (!session?.user?.activeOrgId || !session.user?.id) {
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

    const invitations = await prisma.invitation.findMany({
        where: {
            organizationId: session.user.activeOrgId,
            acceptedAt: null,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return NextResponse.json(invitations);
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user?.activeOrgId || !session.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId: session.user.activeOrgId,
            userId: session.user.id,
        },
        include: {
            organization: {
                select: {
                    name: true,
                },
            },
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = invitationSchema.parse(body);

        const existingMember = await prisma.organizationMember.findFirst({
            where: {
                organizationId: session.user.activeOrgId,
                user: {
                    email: validated.email,
                },
            },
        });

        if (existingMember) {
            return new NextResponse('User is already a member', { status: 400 });
        }

        const existingInvitation = await prisma.invitation.findFirst({
            where: {
                organizationId: session.user.activeOrgId,
                email: validated.email,
                acceptedAt: null,
                expires: {
                    gt: new Date(),
                },
            },
        });

        if (existingInvitation) {
            return new NextResponse('Invitation already sent', { status: 400 });
        }

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

        const inviteUrl = `${getBaseUrl()}/invite/${token}`;

        if (resend && process.env.EMAIL_FROM) {
            try {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM,
                    to: validated.email,
                    subject: `You're invited to join ${membership.organization.name}`,
                    html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Invitation to join ${membership.organization.name}</h2>
              <p>
                ${membership.user.name || membership.user.email || 'A team member'} invited you
                to join <strong>${membership.organization.name}</strong> as
                <strong> ${validated.role}</strong>.
              </p>
              <p>
                Click the button below to accept the invitation:
              </p>
              <p>
                <a
                  href="${inviteUrl}"
                  style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;"
                >
                  Accept Invitation
                </a>
              </p>
              <p>If the button does not work, use this link:</p>
              <p>${inviteUrl}</p>
              <p>This invitation expires in 7 days.</p>
            </div>
          `,
                });
            } catch (emailError) {
                console.error('Invitation email send error:', emailError);
            }
        } else {
            console.log(`Invitation link: ${inviteUrl}`);
        }

        return NextResponse.json({
            invitation,
            inviteUrl,
            emailSent: Boolean(resend && process.env.EMAIL_FROM),
        });
    } catch (error) {
        console.error('Invitation route error:', error);

        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0]?.message || 'Invalid input', {
                status: 400,
            });
        }

        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 });
        }

        return new NextResponse('Internal server error', { status: 500 });
    }
}