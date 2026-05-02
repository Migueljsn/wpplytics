import type { NextAuthConfig } from 'next-auth';

// Edge-safe config — no Prisma or bcrypt imports here (used in middleware)

type ExtendedToken = { role?: string; clientSlug?: string | null };

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const t = token as typeof token & ExtendedToken;
        const u = user as unknown as Record<string, unknown>;
        t.role = u.role as string ?? 'ADMIN';
        t.clientSlug = u.clientSlug as string | null ?? null;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as typeof token & ExtendedToken;
      const u = session.user as unknown as Record<string, unknown>;
      u.role = t.role;
      u.clientSlug = t.clientSlug;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const user = auth?.user as Record<string, unknown> | undefined;
      const role = user?.role as string | undefined;
      const clientSlug = user?.clientSlug as string | null | undefined;
      const isLoginPage = nextUrl.pathname === '/login';
      const isAdminPage = nextUrl.pathname.startsWith('/admin');

      if (isLoggedIn && isLoginPage) {
        if (role === 'CLIENT' && clientSlug) {
          return Response.redirect(new URL(`/clients/${clientSlug}`, nextUrl));
        }
        return Response.redirect(new URL('/admin', nextUrl));
      }

      if (!isLoggedIn && !isLoginPage) return false;

      // Block CLIENT users from /admin
      if (isLoggedIn && isAdminPage && role === 'CLIENT') {
        if (clientSlug) return Response.redirect(new URL(`/clients/${clientSlug}`, nextUrl));
        return false;
      }

      return true;
    },
  },
  providers: [],
};
