'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatConversation, ChatMessage } from '@/lib/types';

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
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const threadRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selectedId]);

  if (conversations.length === 0) {
    return (
      <div className="cv-empty">
        <p>Nenhuma conversa registrada ainda.<br />Aguardando mensagens via WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="cv-layout">
      <div className="cv-list">
        <div className="cv-list-header">
          <span>Conversas</span>
          <span className="cv-badge">{conversations.length}</span>
        </div>
        <div className="cv-list-scroll">
          {conversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            return (
              <button
                key={conv.id}
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
    </div>
  );
}
