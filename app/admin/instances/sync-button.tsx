'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { syncAllStatuses } from './actions';

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);
  const router                = useRouter();

  async function handleSync() {
    setLoading(true);
    setMsg(null);
    try {
      const { updated, errors } = await syncAllStatuses();
      if (errors.length > 0) {
        setMsg(`${updated} atualizada(s). Erro em: ${errors.join(', ')}`);
      } else if (updated === 0) {
        setMsg('Tudo sincronizado.');
      } else {
        setMsg(`${updated} instância(s) atualizada(s).`);
      }
      router.refresh();
    } catch {
      setMsg('Erro ao sincronizar.');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4_000);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {msg && (
        <span style={{ fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600 }}>
          {msg}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="action-button secondary"
        style={{ fontSize: '0.82rem', minHeight: 36, padding: '0 16px', gap: 6 }}
      >
        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        {loading ? 'Sincronizando…' : 'Sincronizar status'}
      </button>
    </div>
  );
}
