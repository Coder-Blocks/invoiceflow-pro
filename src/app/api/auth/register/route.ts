import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('Registration attempt:', body.email);

        const validated = registerSchema.parse(body);

        const existingUser = await prisma.user.findUnique({
            where: { email: validated.email },
        });

        if (existingUser) {
            console.log('User already exists:', validated.email);
            return new NextResponse('User already exists', { status: 400 });
        }

        const hashedPassword = await hash(validated.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: validated.name,
                email: validated.email,
                password: hashedPassword,
            },
        });

        console.log('User created:', user.id);

        // Create default organization (this will also happen in createUser event, but we do it here to ensure)
        const existingOrg = await prisma.organization.findFirst({
            where: { ownerId: user.id },
        });

        if (!existingOrg) {
            const org = await prisma.organization.create({
                data: {
                    name: `${user.name || user.email.split('@')[0]}'s Workspace`,
                    slug: user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now(),
                    email: user.email,
                    ownerId: user.id,
                    members: {
                        create: {
                            userId: user.id,
                            role: 'OWNER',
                        },
                    },
                },
            });
            console.log('Default organization created:', org.id);
        }

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error('Registration error:', error);
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return new NextResponse(errorMessage, { status: 500 });
    }
}