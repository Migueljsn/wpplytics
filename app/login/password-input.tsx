'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export function PasswordInput() {
  const [show, setShow] = useState(false);
  return (
    <div className="login-field">
      <label htmlFor="password">Senha</label>
      <div className="login-input-wrap">
        <Lock size={16} className="login-input-icon" />
        <input
          id="password"
          name="password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="login-input login-input-padded login-input-padded-right"
        />
        <button
          type="button"
          className="login-eye-btn"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}
