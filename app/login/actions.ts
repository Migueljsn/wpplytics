'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function loginAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/admin',
    });
  } catch (err) {
    // NextAuth throws NEXT_REDIRECT on success — must re-throw so Next.js handles it
    if ((err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    if (err instanceof AuthError) {
      return 'E-mail ou senha incorretos.';
    }
    // Unexpected errors (e.g. missing AUTH_SECRET, DB down)
    console.error('[login] unexpected error:', err);
    return 'Erro interno. Verifique as configurações do servidor.';
  }
  return null;
}
