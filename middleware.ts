import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect only pages — exclude all API routes and static files.
  // API routes handle their own auth internally.
  // The Evolution API webhook (/api/evolution) must remain public.
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
