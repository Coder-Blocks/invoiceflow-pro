import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
    invoicePrefix: z.string().optional(),
    brandColor: z.string().optional(),
    logo: z.string().optional().nullable(),
    defaultNotes: z.string().optional().nullable(),
    defaultTerms: z.string().optional().nullable(),
    defaultFooter: z.string().optional().nullable(),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await prisma.organization.findUnique({
        where: { id: session.user.activeOrgId },
    });

    return NextResponse.json(org);
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only OWNER and ADMIN can update settings
    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId: session.user.activeOrgId,
            userId: session.user.id,
        },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = updateSchema.parse(body);

        const updated = await prisma.organization.update({
            where: { id: session.user.activeOrgId },
            data: {
                ...validated,
                settings: {
                    upsert: {
                        create: {
                            defaultNotes: validated.defaultNotes,
                            defaultTerms: validated.defaultTerms,
                            defaultFooter: validated.defaultFooter,
                        },
                        update: {
                            defaultNotes: validated.defaultNotes,
                            defaultTerms: validated.defaultTerms,
                            defaultFooter: validated.defaultFooter,
                        },
                    },
                },
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: session.user.activeOrgId,
                action: 'UPDATE',
                entity: 'ORGANIZATION',
                entityId: updated.id,
                details: { changes: validated },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}