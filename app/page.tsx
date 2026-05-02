import { redirect } from 'next/navigation';

// Unauthenticated users are sent to /login by the middleware.
// Authenticated users always go to /admin.
export default function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect('/admin' as any);
}
