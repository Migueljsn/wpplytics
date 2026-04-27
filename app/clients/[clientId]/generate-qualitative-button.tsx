'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  clientId: string;
  clientSlug: string;
  instanceId: string;
  from: string | null;
  to: string;
  disabled?: boolean;
};

export function GenerateQualitativeButton({ clientId, clientSlug, instanceId, from, to, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/qualitative/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, instanceId, from, to }),
      });
      const data = await res.json() as { runId?: string; error?: string };
      if (!res.ok || !data.runId) {
        setError(data.error === 'no_text_messages'
          ? 'Sem mensagens de texto no período.'
          : 'Erro ao gerar relatório.');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/clients/${clientSlug}/qualitative/${data.runId}` as any);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        className="action-button secondary"
        disabled={disabled || loading}
        onClick={handleGenerate}
      >
        {loading ? 'Gerando…' : 'Gerar Qualitativo'}
      </button>
      {error && <p className="status-warning" style={{ fontSize: '0.78rem' }}>{error}</p>}
    </div>
  );
}
