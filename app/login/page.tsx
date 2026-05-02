'use client';

import { useActionState } from 'react';
import { Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { loginAction } from './actions';

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null);

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

        <form action={action} className="login-form">
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
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="login-input login-input-padded"
              />
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={pending} className="action-button login-submit">
            {pending ? (
              <><Loader2 size={16} className="spin-icon" /> Entrando…</>
            ) : (
              <><LogIn size={16} /> Entrar</>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
