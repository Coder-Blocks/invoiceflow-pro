import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getOrCreateGoogleUser(email: string, name?: string | null, image?: string | null) {
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { organization: true },
      },
    },
  });

  if (user && user.memberships.length > 0) return user;

  if (user && user.memberships.length === 0) {
    const orgName = `${user.name || name || "My"} Workspace`;
    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug: `${slugify(orgName)}-${Date.now()}`,
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    return user!;
  }

  const orgName = name ? `${name}'s Workspace` : "My Workspace";

  return await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      image: image || null,
      memberships: {
        create: {
          role: "OWNER",
          status: "ACTIVE",
          organization: {
            create: {
              name: orgName,
              slug: `${slugify(orgName)}-${Date.now()}`,
            },
          },
        },
      },
    },
    include: {
      memberships: {
        include: { organization: true },
      },
    },
  });
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: { organization: true },
            },
          },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const membership = user.memberships[0];

        return {
          id: user.id,
          name: user.name || "",
          email: user.email,
          image: user.image || "",
          organizationId: membership?.organizationId || "",
          organizationName: membership?.organization?.name || "",
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await getOrCreateGoogleUser(user.email, user.name, user.image);
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const dbUser = await getOrCreateGoogleUser(
          token.email,
          token.name,
          typeof token.picture === "string" ? token.picture : null
        );

        const membership = dbUser.memberships[0];

        token.id = dbUser.id;
        token.organizationId = membership?.organizationId || "";
        token.organizationName = membership?.organization?.name || "";
      }

      if (user) {
        token.id = user.id;
        token.organizationId = (user as any).organizationId || token.organizationId || "";
        token.organizationName =
          (user as any).organizationName || token.organizationName || "";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).organizationId = token.organizationId as string;
        (session.user as any).organizationName = token.organizationName as string;
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};