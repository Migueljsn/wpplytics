'use server';

import { signIn } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function getRedirectTarget(email: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      include: { client: { select: { slug: true } } },
    });
    if (user?.role === 'CLIENT' && user.client?.slug) {
      return `/clients/${user.client.slug}`;
    }
  } catch {
    // fall through
  }
  return '/admin';
}

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string ?? '').trim();
  const redirectTo = await getRedirectTarget(email);
  // Pass formData directly — next-auth beta.31 reads email/password from it
  await signIn('credentials', { ...Object.fromEntries(formData), redirectTo });
}
