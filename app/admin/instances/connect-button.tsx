'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { QrCode, X, CheckCircle, AlertCircle, RefreshCw, Loader } from 'lucide-react';

type Props = { evolutionName: string; instanceId: string; label: string };
type Phase = 'idle' | 'loading' | 'qr' | 'connected' | 'error';

export function ConnectButton({ evolutionName, instanceId, label }: Props) {
  const [open, setOpen]    = useState(false);
  const [phase, setPhase]  = useState<Phase>('idle');
  const [qrBase64, setQr]  = useState<string | null>(null);
  const [errorMsg, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router     = useRouter();

  // Needed so createPortal only runs client-side
  useEffect(() => { setMounted(true); }, []);

  const stopAll = useCallback(() => {
    if (pollRef.current)    { clearInterval(pollRef.current);   pollRef.current   = null; }
    if (qrTimerRef.current) { clearTimeout(qrTimerRef.current); qrTimerRef.current = null; }
  }, []);

  const fetchQr = useCallback(async () => {
    setPhase('loading');
    setErr(null);
    try {
      const res  = await fetch(`/api/evolution/qr/${encodeURIComponent(evolutionName)}`, { cache: 'no-store' });
      const data = await res.json() as { base64?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.base64) {
        setQr(data.base64);
        setPhase('qr');
        qrTimerRef.current = setTimeout(fetchQr, 55_000);
      } else {
        setPhase('connected');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro desconhecido');
      setPhase('error');
    }
  }, [evolutionName]);

  const startPolling = useCallback(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/evolution/instance-status/${instanceId}`, { cache: 'no-store' });
        const data = await res.json() as { status?: string };
        if (data.status === 'CONNECTED') {
          stopAll();
          setPhase('connected');
          setTimeout(() => { setOpen(false); router.refresh(); }, 2_000);
        }
      } catch { /* ignore */ }
    }, 3_000);
  }, [instanceId, stopAll, router]);

  const open_ = useCallback(async () => {
    setOpen(true);
    await fetchQr();
    startPolling();
  }, [fetchQr, startPolling]);

  const close_ = useCallback(() => {
    stopAll();
    setOpen(false);
    setPhase('idle');
    setQr(null);
    setErr(null);
    router.refresh();
  }, [stopAll, router]);

  useEffect(() => () => stopAll(), [stopAll]);

  const modal = open ? (
    <div
      className="inst-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) close_(); }}
    >
      <div className="inst-modal" role="dialog" aria-modal="true" aria-label={`Conectar ${label}`}>
        <button className="inst-modal-close" onClick={close_} aria-label="Fechar">
          <X size={16} />
        </button>

        <h2 className="inst-modal-title">
          <QrCode size={18} />
          <span>{label}</span>
        </h2>
        <p className="muted" style={{ fontSize: '0.8rem', margin: '0 0 20px', lineHeight: 1.5 }}>
          Escaneie o QR code pelo WhatsApp para conectar esta instância.
        </p>

        {phase === 'loading' && (
          <div className="inst-modal-center">
            <Loader size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
            <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>Gerando QR code…</p>
          </div>
        )}

        {phase === 'qr' && qrBase64 && (
          <div className="inst-modal-center">
            <div className="inst-qr-frame">
              <img src={qrBase64} alt="QR Code WhatsApp" className="inst-qr-img" />
            </div>
            <p style={{ fontSize: '0.82rem', marginTop: 14, textAlign: 'center', color: 'var(--muted)', lineHeight: 1.6 }}>
              Abra o <strong style={{ color: 'var(--text)' }}>WhatsApp</strong> →<br />
              Dispositivos conectados → Conectar dispositivo
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: '0.73rem', color: 'var(--muted)' }}>
              <RefreshCw size={11} />
              QR atualiza automaticamente a cada 55s
            </div>
          </div>
        )}

        {phase === 'connected' && (
          <div className="inst-modal-center">
            <CheckCircle size={52} style={{ color: 'var(--brand)' }} />
            <p style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: 14, letterSpacing: '-0.02em' }}>
              Conectado!
            </p>
            <p className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
              Fechando automaticamente…
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="inst-modal-center">
            <AlertCircle size={48} style={{ color: 'var(--red)' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', marginTop: 14 }}>Erro ao buscar QR</p>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4, textAlign: 'center', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              onClick={fetchQr}
              className="action-button secondary"
              style={{ marginTop: 18, fontSize: '0.82rem', minHeight: 36 }}
            >
              <RefreshCw size={13} /> Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={open_}
        className="action-button"
        style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 12px', gap: 4 }}
      >
        <QrCode size={13} /> Conectar
      </button>

      {/* Portal renders the modal directly in document.body, escaping any
          parent containing block created by CSS transforms/animations */}
      {mounted && createPortal(modal, document.body)}
    </>
  );
}
