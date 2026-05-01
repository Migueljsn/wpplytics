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

  // Determine redirect destination based on role (avoids double-redirect)
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
    if ((err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw err;
    if (err instanceof AuthError) return 'E-mail ou senha incorretos.';
    console.error('[login] unexpected error:', err);
    return 'Erro interno. Verifique as configurações do servidor.';
  }
  return null;
}
