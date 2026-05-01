'use client';

import { useState } from 'react';
import { Mail, Lock, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { loginAction } from './actions';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();

  const errorParam = searchParams.get('error');
  const errorMessage =
    errorParam === 'CredentialsSignin' || errorParam === 'credentials'
      ? 'E-mail ou senha incorretos.'
      : errorParam
      ? 'Erro ao entrar. Tente novamente.'
      : null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await loginAction(formData);
    setPending(false);
  }

  return (
    <form action={handleSubmit} className="login-form">
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

      <button type="submit" disabled={pending} className="action-button login-submit">
        {pending ? (
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
        <Suspense fallback={<div className="login-form" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
