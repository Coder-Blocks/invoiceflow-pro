import NextAuth from "next-auth";
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

async function ensureGoogleUser(email: string, name?: string | null, image?: string | null) {
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { organization: true },
      },
    },
  });

  if (user) return user;

  const orgName = name ? `${name}'s Workspace` : "My Workspace";
  const baseSlug = slugify(orgName) || "workspace";
  const slug = `${baseSlug}-${Date.now()}`;

  user = await prisma.user.create({
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
              slug,
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

  return user;
}

const handler = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase();
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
      

      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const dbUser = await ensureGoogleUser(
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
});

export { handler as GET, handler as POST };