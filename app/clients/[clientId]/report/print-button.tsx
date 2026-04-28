'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      className="action-button secondary"
      style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, fontSize: '0.82rem', padding: '0 14px' }}
      onClick={() => window.print()}
    >
      <Printer size={14} /> Imprimir / PDF
    </button>
  );
}
