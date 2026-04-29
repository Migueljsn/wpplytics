'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MessageSquare, Lock, EyeOff, RefreshCw, Mic, FileText, Video, Paperclip, X, Download, ImageOff, ZoomIn, Search } from 'lucide-react';
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

function formatBytes(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(secs?: number | null) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function makeSnippet(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return { before: text.slice(0, 60), match: '', after: '' };
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 30);
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, idx),
    match: text.slice(idx, idx + query.length),
    after: text.slice(idx + query.length, end) + (end < text.length ? '…' : ''),
  };
}

function ImageBubble({ msg }: { msg: ChatMessage }) {
  const src = `/api/media/${msg.id}`;
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [open, setOpen] = useState(false);
  const isSticker = msg.messageType === 'sticker';

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <>
      <div className={`cv-media-image${isSticker ? ' cv-media-sticker' : ''}`}>
        {status === 'error' ? (
          <div className="cv-img-error">
            <ImageOff size={20} />
            <span>Imagem não disponível</span>
          </div>
        ) : (
          <div className="cv-img-wrap">
            {status === 'loading' && <div className="cv-img-skeleton" />}
            <img
              src={src}
              alt={msg.mediaCaption ?? 'imagem'}
              className="cv-img-thumb"
              style={{ opacity: status === 'loading' ? 0 : 1 }}
              onLoad={() => setStatus('loaded')}
              onError={() => setStatus('error')}
            />
            {status === 'loaded' && !isSticker && (
              <button className="cv-img-zoom" onClick={() => setOpen(true)} aria-label="Ampliar imagem">
                <ZoomIn size={14} />
              </button>
            )}
          </div>
        )}
        {isSticker && <span className="cv-media-tag">Sticker</span>}
      </div>
      {msg.mediaCaption && <p className="cv-media-caption">{msg.mediaCaption}</p>}

      {open && typeof document !== 'undefined' && createPortal(
        <div className="cv-lightbox" onClick={close} role="dialog" aria-modal="true">
          <div className="cv-lightbox-inner" onClick={e => e.stopPropagation()}>
            <img src={src} alt={msg.mediaCaption ?? 'imagem'} className="cv-lightbox-img" />
            {msg.mediaCaption && <p className="cv-lightbox-caption">{msg.mediaCaption}</p>}
          </div>
          <button className="cv-lightbox-close" onClick={close} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

function MediaBubble({ msg }: { msg: ChatMessage }) {
  const src = `/api/media/${msg.id}`;

  if (msg.messageType === 'audio') {
    return (
      <div className="cv-media-audio">
        <Mic size={14} className="cv-media-icon" />
        <audio controls preload="none" className="cv-audio-player">
          <source src={src} type={msg.mediaMimetype ?? 'audio/ogg'} />
        </audio>
        {msg.mediaDuration && <span className="cv-media-meta">{formatDuration(msg.mediaDuration)}</span>}
      </div>
    );
  }

  if (msg.messageType === 'image' || msg.messageType === 'sticker') {
    return <ImageBubble msg={msg} />;
  }

  if (msg.messageType === 'document') {
    return (
      <a href={src} download={msg.mediaFileName ?? true} className="cv-media-doc" target="_blank" rel="noreferrer">
        <FileText size={20} className="cv-media-icon" />
        <div className="cv-media-doc-info">
          <span className="cv-media-doc-name">{msg.mediaFileName ?? 'Documento'}</span>
          {msg.mediaSize && <span className="cv-media-meta">{formatBytes(msg.mediaSize)}</span>}
        </div>
        <Download size={14} className="cv-media-dl" />
      </a>
    );
  }

  if (msg.messageType === 'video') {
    return (
      <div className="cv-media-video">
        <Video size={16} className="cv-media-icon" />
        <span>Vídeo</span>
        {msg.mediaDuration && <span className="cv-media-meta">{formatDuration(msg.mediaDuration)}</span>}
        {msg.mediaSize && <span className="cv-media-meta">{formatBytes(msg.mediaSize)}</span>}
      </div>
    );
  }

  return (
    <div className="cv-media-unknown">
      <Paperclip size={13} className="cv-media-icon" />
      <span>Mídia</span>
    </div>
  );
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
    const isMedia = msg.messageType !== 'text' && msg.messageType !== 'unknown';
    nodes.push(
      <div key={msg.id} id={`msg-${msg.id}`} className={`cv-bubble ${msg.fromMe ? 'cv-bubble-out' : 'cv-bubble-in'}`}>
        {msg.textContent ? (
          <p>{msg.textContent}</p>
        ) : isMedia ? (
          <MediaBubble msg={msg} />
        ) : (
          <p className="cv-media-unknown"><Paperclip size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />mídia</p>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const visible = conversations.filter((c) => visibleIds.has(c.id));
  const selected = visible.find((c) => c.id === selectedId) ?? null;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const contacts = visible.filter(
      (c) => c.contactName.toLowerCase().includes(q) || c.remoteJid.toLowerCase().includes(q),
    );
    const messages: { conv: ChatConversation; msg: ChatMessage }[] = [];
    for (const conv of visible) {
      for (const msg of conv.messages) {
        if (msg.textContent?.toLowerCase().includes(q)) {
          messages.push({ conv, msg });
        }
      }
    }
    return { contacts, messages };
  }, [searchQuery, visible]);

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

  useEffect(() => {
    if (!highlightMsgId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`msg-${highlightMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('cv-bubble-highlight');
      }
      setHighlightMsgId(null);
    }, 80);
    return () => clearTimeout(timer);
  }, [highlightMsgId, selectedId]);

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
        <MessageSquare size={32} className="cv-empty-icon" />
        <p>Nenhuma conversa registrada ainda.<br />Aguardando mensagens via WhatsApp.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="cv-empty">
        <EyeOff size={32} className="cv-empty-icon" />
        <p>Todas as conversas foram ocultadas.</p>
      </div>
    );
  }

  return (
    <div className="cv-layout">
      <div className="cv-list">
        <div className="cv-list-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={14} />
            Conversas
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="cv-badge">{visible.length}</span>
            <span className="cv-sync-label" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <RefreshCw size={11} className={secondsAgo < 5 ? 'spin-icon' : ''} style={{ opacity: 0.6 }} />
              {secondsAgo < 5 ? 'agora' : `${secondsAgo}s`}
            </span>
          </div>
        </div>
        <div className="cv-search-bar">
          <Search size={13} className="cv-search-icon" />
          <input
            type="text"
            className="cv-search-input"
            placeholder="Buscar conversa ou mensagem…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="cv-search-clear" onClick={() => setSearchQuery('')} aria-label="Limpar busca">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="cv-list-scroll">
          {searchResults ? (
            searchResults.contacts.length === 0 && searchResults.messages.length === 0 ? (
              <div className="cv-search-empty">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <>
                {searchResults.contacts.length > 0 && (
                  <>
                    <div className="cv-search-section">Contatos · {searchResults.contacts.length}</div>
                    {searchResults.contacts.map((conv) => (
                      <div key={conv.id} className={`cv-row-wrap${conv.id === selectedId ? ' cv-row-wrap-active' : ''}`}>
                        <button className="cv-row" onClick={() => setSelectedId(conv.id)}>
                          <div className="cv-avatar cv-avatar-sm">{initials(conv.contactName)}</div>
                          <div className="cv-row-body">
                            <div className="cv-row-head">
                              <span className="cv-row-name">{conv.contactName}</span>
                              <span className="cv-row-time">{formatLastTime(conv.endedAt)}</span>
                            </div>
                            <p className="cv-row-preview">{conv.remoteJid.split('@')[0]}</p>
                          </div>
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.messages.length > 0 && (
                  <>
                    <div className="cv-search-section">Mensagens · {searchResults.messages.length}</div>
                    {searchResults.messages.map(({ conv, msg }) => {
                      const s = makeSnippet(msg.textContent ?? '', searchQuery);
                      return (
                        <div key={msg.id} className={`cv-row-wrap${conv.id === selectedId ? ' cv-row-wrap-active' : ''}`}>
                          <button
                            className="cv-row"
                            onClick={() => { setSelectedId(conv.id); setHighlightMsgId(msg.id); }}
                          >
                            <div className="cv-avatar cv-avatar-sm">{initials(conv.contactName)}</div>
                            <div className="cv-row-body">
                              <div className="cv-row-head">
                                <span className="cv-row-name">{conv.contactName}</span>
                                <span className="cv-row-time">{formatTime(msg.sentAt)}</span>
                              </div>
                              <p className="cv-search-snippet">
                                {s.before}<mark className="cv-search-mark">{s.match}</mark>{s.after}
                              </p>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )
          ) : (
            visible.map((conv) => {
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
                    {isDeleting ? <RefreshCw size={12} className="spin-icon" /> : <X size={14} />}
                  </button>
                </div>
              );
            })
          )}
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
              <span className="cv-chip-readonly" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={11} /> Somente leitura
              </span>
            </div>
          </div>

          <div className="cv-thread" ref={threadRef}>
            {renderMessages(selected.messages)}
          </div>

          <div className="cv-footer">
            <div className="cv-disabled-input">
              <Lock size={13} style={{ flexShrink: 0 }} /> Envio de mensagens desabilitado — modo observação
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
                  <EyeOff size={14} /> Ocultar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
