import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth.config';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      role: string;
      clientId?: string | null;
      clientSlug?: string | null;
    } & DefaultSession['user'];
  }
}

type ExtendedToken = {
  role?: string;
  clientId?: string | null;
  clientSlug?: string | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { client: { select: { slug: true } } },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.hashedPassword);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId ?? null,
          clientSlug: user.client?.slug ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role as string;
        token.clientId = (user as Record<string, unknown>).clientId as string | null;
        token.clientSlug = (user as Record<string, unknown>).clientSlug as string | null;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as typeof token & ExtendedToken;
      session.user.role = t.role ?? 'ADMIN';
      session.user.clientId = t.clientId;
      session.user.clientSlug = t.clientSlug;
      return session;
    },
  },
  session: { strategy: 'jwt' },
});
