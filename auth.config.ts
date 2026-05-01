import type { NextAuthConfig } from 'next-auth';

// Edge-safe config — no Prisma or bcrypt imports here (used in middleware)
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const user = auth?.user as { role?: string; clientSlug?: string } | undefined;
      const role = user?.role;
      const clientSlug = user?.clientSlug;

      // Unauthenticated → login
      if (!isLoggedIn && pathname !== '/login') return false;

      // Logged in on login page → route to correct home
      if (isLoggedIn && pathname === '/login') {
        if (role === 'CLIENT' && clientSlug) {
          return Response.redirect(new URL(`/clients/${clientSlug}`, nextUrl));
        }
        return Response.redirect(new URL('/admin', nextUrl));
      }

      // Admin area → ADMIN only
      if (pathname.startsWith('/admin') && role !== 'ADMIN') {
        return Response.redirect(new URL('/login', nextUrl));
      }

      // Client pages → CLIENT can only access own slug
      if (pathname.startsWith('/clients/') && role === 'CLIENT' && clientSlug) {
        const pathSlug = pathname.split('/')[2];
        if (pathSlug && pathSlug !== clientSlug) {
          return Response.redirect(new URL(`/clients/${clientSlug}`, nextUrl));
        }
      }

      return true;
    },
  },
  providers: [],
};
