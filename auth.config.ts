import type { NextAuthConfig } from 'next-auth';

// Edge-safe config — no Prisma or bcrypt imports here (used in middleware)
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === '/login';

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL('/admin', nextUrl));
      }
      if (!isLoggedIn && !isLoginPage) {
        return false;
      }
      return true;
    },
  },
  providers: [],
};
