'use client';

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { Mail } from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [csrfToken, setCsrfToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/auth/csrf')
      .then((r) => r.json())
      .then((d: { csrfToken: string }) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  const errorParam = searchParams.get('error');
  const errorMessage =
    errorParam === 'CredentialsSignin' || errorParam === 'credentials'
      ? 'E-mail ou senha incorretos.'
      : errorParam
      ? 'Erro ao entrar. Tente novamente.'
      : null;

  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';

  return (
    <form
      method="POST"
      action="/api/auth/callback/credentials"
      className="login-form"
      onSubmit={() => setSubmitting(true)}
    >
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="login-field">
        <label htmlFor="email">E-mail</label>
        <div className="login-input-wrap">
          <Mail size={16} className="login-input-icon" />
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

      <div className="login-field">
        <label htmlFor="password">Senha</label>
        <div className="login-input-wrap">
          <Lock size={16} className="login-input-icon" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="login-input login-input-padded login-input-padded-right"
          />
          <button
            type="button"
            className="login-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {errorMessage && <p className="login-error">{errorMessage}</p>}

      <button type="submit" disabled={submitting || !csrfToken} className="action-button login-submit">
        {submitting ? (
          <><Loader2 size={16} className="spin-icon" /> Entrando…</>
        ) : (
          <><LogIn size={16} /> Entrar</>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
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
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
