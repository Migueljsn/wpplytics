'use client';

import { useState } from 'react';
import { Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { runCleanup } from './actions';

type Result = { deletedMessages: number; remaining: number };

export function CleanupButton({ messageCount }: { messageCount: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleCleanup() {
    setLoading(true);
    try {
      const res = await runCleanup();
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cleanup-card">
      <div className="cleanup-stats">
        <div className="cleanup-stat">
          <span className="cleanup-stat-value">{result ? result.remaining : messageCount}</span>
          <span className="cleanup-stat-label">Mensagens no banco</span>
        </div>
      </div>

      {result ? (
        <div className="cleanup-result">
          <CheckCircle2 size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <span>
            Limpeza concluída — <strong>{result.deletedMessages}</strong> mensagens removidas.
          </span>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
          Remove mensagens com mais de 30 dias.
        </p>
      )}

      <button
        className="action-button cv-modal-danger"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => void handleCleanup()}
        disabled={loading || !!result}
      >
        {loading ? (
          <><Loader2 size={14} className="spin-icon" /> Limpando…</>
        ) : (
          <><Trash2 size={14} /> Limpar banco de dados</>
        )}
      </button>
    </div>
  );
}
