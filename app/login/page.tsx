'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null);

  return (
    <main className="login-shell">
      <div className="login-panel">
        <p className="kicker">WPPlytics</p>
        <h1 className="login-title">Entrar</h1>
        <p className="login-sub">Acesso restrito à equipe autorizada.</p>

        <form action={action} className="login-form">
          <div className="login-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              className="login-input"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="login-input"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={pending} className="action-button login-submit">
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
