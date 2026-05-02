import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { PasswordInput } from './password-input';
import { ThemeToggle } from '@/app/components/theme-toggle';

type LoginPageProps = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

async function getCsrfToken(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const res = await fetch(`${proto}://${host}/api/auth/csrf`, {
    headers: { cookie: hdrs.get('cookie') ?? '' },
  });
  const data = await res.json() as { csrfToken: string };
  return data.csrfToken;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user?.role === 'ADMIN') redirect('/admin' as never);
  if (session?.user?.role === 'CLIENT' && session.user.clientSlug) {
    redirect(`/clients/${session.user.clientSlug}` as never);
  }

  const { error, callbackUrl } = await searchParams;
  const csrfToken = await getCsrfToken();

  const errorMessage =
    error === 'CredentialsSignin' || error === 'credentials'
      ? 'E-mail ou senha incorretos.'
      : error
      ? 'Erro ao entrar. Tente novamente.'
      : null;

  return (
    <main className="login-shell">
      <div style={{ position: 'fixed', top: 20, right: 20 }}>
        <ThemeToggle />
      </div>
      <div className="login-panel">
        <div className="login-logo">
          <span className="login-logo-icon">W</span>
        </div>
        <p className="kicker">WPPlytics</p>
        <h1 className="login-title">Entrar</h1>
        <p className="login-sub">Acesso restrito à equipe autorizada.</p>

        <form
          method="POST"
          action="/api/auth/callback/credentials"
          className="login-form"
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input
            type="hidden"
            name="callbackUrl"
            value={callbackUrl ?? '/admin'}
          />

          <div className="login-field">
            <label htmlFor="email">E-mail</label>
            <div className="login-input-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                className="login-input login-input-padded"
              />
            </div>
          </div>

          <PasswordInput />

          {errorMessage && <p className="login-error">{errorMessage}</p>}

          <button type="submit" className="action-button login-submit">
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
