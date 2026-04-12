import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export function getOAuthProviderAvailability(env: NodeJS.ProcessEnv = process.env) {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_ID && env.GITHUB_SECRET),
  };
}

function createOAuthProviders(env: NodeJS.ProcessEnv = process.env): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, username: user.username };
      },
    }),
  ];

  const oauthAvailability = getOAuthProviderAvailability(env);

  if (oauthAvailability.google) {
    providers.push(
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (oauthAvailability.github) {
    providers.push(
      GitHubProvider({
        clientId: env.GITHUB_ID!,
        clientSecret: env.GITHUB_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  return providers;
}

export function createAuthOptions(env: NodeJS.ProcessEnv = process.env): NextAuthOptions {
  return {
    pages: { signIn: "/signin" },
    session: { strategy: "jwt" },
    adapter: PrismaAdapter(prisma),
    providers: createOAuthProviders(env),
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.username = user.username ?? null;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = (token.id as string) ?? session.user.id;
          session.user.username = (token.username as string | null) ?? null;
        }
        return session;
      },
    },
  };
}

export const authOptions = createAuthOptions();
