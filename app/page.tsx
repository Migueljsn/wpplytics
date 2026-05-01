import { auth } from '@/auth';
import { redirect } from 'next/navigation';

// Root always redirects to the correct dashboard based on role.
// Unauthenticated users are already sent to /login by the middleware.
export default async function HomePage() {
  const session = await auth();
  if (session?.user?.role === 'CLIENT' && session.user.clientSlug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect(`/clients/${session.user.clientSlug}` as any);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect('/admin' as any);
}
