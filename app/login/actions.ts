'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export async function loginAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  // Determine redirect destination based on role
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
    // redirect: false → sets the session cookie and returns instead of throwing NEXT_REDIRECT
    await signIn('credentials', { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return 'E-mail ou senha incorretos.';
    console.error('[login] unexpected error:', err);
    return 'Erro interno. Verifique as configurações do servidor.';
  }

  // Explicit redirect after successful sign-in (propagates correctly with useActionState)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect(redirectTo as any);
}
