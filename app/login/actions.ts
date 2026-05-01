'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function loginAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  let redirectTo = '/admin';
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: { select: { slug: true } } },
    });
    if (user?.role === 'CLIENT' && user.client?.slug) {
      redirectTo = `/clients/${user.client.slug}`;
    }
  } catch {
    // DB unreachable — auth will fail below anyway
  }

  try {
    await signIn('credentials', { email, password, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) return 'E-mail ou senha incorretos.';
    throw err; // Re-throw tudo mais (NEXT_REDIRECT incluso — Next.js trata o redirect)
  }
  return null;
}
