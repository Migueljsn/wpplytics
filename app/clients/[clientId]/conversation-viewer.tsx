'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatConversation, ChatMessage } from '@/lib/types';

const POLL_INTERVAL_MS = 15_000;

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatLastTime(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderMessages(messages: ChatMessage[]) {
  if (messages.length === 0) {
    return <div className="cv-thread-empty">Sem mensagens nesta conversa.</div>;
  }

  const nodes: React.ReactNode[] = [];
  let lastDate = '';

  for (const msg of messages) {
    const dateLabel = formatDateLabel(msg.sentAt);
    if (dateLabel !== lastDate) {
      lastDate = dateLabel;
      nodes.push(
        <div key={`sep-${msg.id}`} className="cv-date-sep">
          <span>{dateLabel}</span>
        </div>,
      );
    }
    nodes.push(
      <div key={msg.id} className={`cv-bubble ${msg.fromMe ? 'cv-bubble-out' : 'cv-bubble-in'}`}>
        {msg.textContent ? (
          <p>{msg.textContent}</p>
        ) : (
          <p className="cv-media">📎 mídia</p>
        )}
        <time>{formatTime(msg.sentAt)}</time>
      </div>,
    );
  }

  return nodes;
}

export function ConversationViewer({ conversations }: { conversations: ChatConversation[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(conversations.map((c) => c.id)));
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const visible = conversations.filter((c) => visibleIds.has(c.id));
  const selected = visible.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setVisibleIds(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const handleScroll = () => {
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (threadRef.current && isAtBottomRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selectedId, conversations]);

  useEffect(() => {
    const poll = setInterval(() => {
      router.refresh();
      setLastUpdated(new Date());
      setSecondsAgo(0);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [router]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  async function confirmDelete() {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      await fetch(`/api/conversations/${confirmId}`, { method: 'DELETE' });
      setVisibleIds((prev) => {
        const next = new Set(prev);
        next.delete(confirmId);
        return next;
      });
      if (selectedId === confirmId) {
        const next = visible.find((c) => c.id !== confirmId);
        setSelectedId(next?.id ?? null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="cv-empty">
        <p>Nenhuma conversa registrada ainda.<br />Aguardando mensagens via WhatsApp.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="cv-empty">
        <p>Todas as conversas foram ocultadas.</p>
      </div>
    );
  }

  return (
    <div className="cv-layout">
      <div className="cv-list">
        <div className="cv-list-header">
          <span>Conversas</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="cv-badge">{visible.length}</span>
            <span className="cv-sync-label">
              {secondsAgo < 5 ? 'agora' : `${secondsAgo}s atrás`}
            </span>
          </div>
        </div>
        <div className="cv-list-scroll">
          {visible.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isDeleting = deletingId === conv.id;
            return (
              <div key={conv.id} className={`cv-row-wrap${conv.id === selectedId ? ' cv-row-wrap-active' : ''}`}>
                <button
                  className={`cv-row${conv.id === selectedId ? ' cv-row-active' : ''}`}
                  onClick={() => setSelectedId(conv.id)}
                >
                  <div className="cv-avatar cv-avatar-sm">{initials(conv.contactName)}</div>
                  <div className="cv-row-body">
                    <div className="cv-row-head">
                      <span className="cv-row-name">{conv.contactName}</span>
                      <span className="cv-row-time">{formatLastTime(conv.endedAt)}</span>
                    </div>
                    <p className="cv-row-preview">
                      {lastMsg?.fromMe && <span className="cv-me">Você: </span>}
                      {lastMsg?.textContent || '📎 mídia'}
                    </p>
                    <div className="cv-row-meta">
                      <span>{conv.messageCount} msgs</span>
                      {conv.firstResponseTimeSecs != null && (
                        <span>TMP {Math.round(conv.firstResponseTimeSecs / 60)}min</span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  className="cv-delete-btn"
                  title="Ocultar conversa"
                  disabled={isDeleting}
                  onClick={(e) => { e.stopPropagation(); setConfirmId(conv.id); }}
                >
                  {isDeleting ? '…' : '×'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="cv-chat">
          <div className="cv-chat-header">
            <div className="cv-avatar cv-avatar-md">{initials(selected.contactName)}</div>
            <div className="cv-chat-info">
              <strong>{selected.contactName}</strong>
              <span>{selected.remoteJid}</span>
            </div>
            <div className="cv-chips">
              <span className="cv-chip-stat">{selected.messageCount} msgs</span>
              {selected.firstResponseTimeSecs != null && (
                <span className="cv-chip-stat">
                  TMP {Math.round(selected.firstResponseTimeSecs / 60)}min
                </span>
              )}
              <span className="cv-chip-readonly">Somente leitura</span>
            </div>
          </div>

          <div className="cv-thread" ref={threadRef}>
            {renderMessages(selected.messages)}
          </div>

          <div className="cv-footer">
            <div className="cv-disabled-input">
              🔒 Envio de mensagens desabilitado — modo observação
            </div>
          </div>
        </div>
      ) : (
        <div className="cv-no-sel">Selecione uma conversa</div>
      )}

      {confirmId && (() => {
        const conv = visible.find((c) => c.id === confirmId);
        return (
          <div className="cv-modal-overlay" onClick={() => setConfirmId(null)}>
            <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="cv-modal-title">Ocultar conversa</h3>
              <p className="cv-modal-body">
                Deseja ocultar a conversa com <strong>{conv?.contactName ?? 'este contato'}</strong>?
                <br />
                Ela sumirá da sua visualização, mas nada será alterado no WhatsApp.
              </p>
              <div className="cv-modal-actions">
                <button className="action-button secondary" onClick={() => setConfirmId(null)}>
                  Cancelar
                </button>
                <button className="action-button cv-modal-danger" onClick={() => void confirmDelete()}>
                  Ocultar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
