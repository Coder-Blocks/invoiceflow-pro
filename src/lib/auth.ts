import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
        signUp: '/signup',
        error: '/login',
        verifyRequest: '/verify-request',
    },
    providers: [
        GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) return null;

                const isValid = await compare(credentials.password as string, user.password);
                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        authorized: async () => true, // Proxy handles actual protection
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;

                // Fetch user's organizations and set default org
                const memberships = await prisma.organizationMember.findMany({
                    where: { userId: user.id },
                    include: { organization: true },
                });

                if (memberships.length > 0) {
                    // Store the first organization ID as the active one (can be changed later)
                    token.activeOrgId = memberships[0].organizationId;
                    token.orgs = memberships.map(m => ({
                        id: m.organizationId,
                        name: m.organization.name,
                        role: m.role,
                    }));
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.activeOrgId = token.activeOrgId as string;
                session.user.orgs = token.orgs as any[];
            }
            return session;
        },
    },
    events: {
        createUser: async ({ user }) => {
            try {
                if (user.email) {
                    const existingOrg = await prisma.organization.findFirst({
                        where: { ownerId: user.id },
                    });
                    if (!existingOrg) {
                        // Create a default organization for the new user
                        await prisma.organization.create({
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
                    }
                }
            } catch (error) {
                console.error('Error in createUser event:', error);
            }
        },
    },
});