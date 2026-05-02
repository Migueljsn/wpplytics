'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MessageSquare, Lock, EyeOff, RefreshCw, Mic, FileText, Video, Paperclip, X, Download, ImageOff, ZoomIn, Search, BarChart2, Sparkles, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import type { ChatConversation, ChatMessage, ConversationSummary } from '@/lib/types';

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

function formatSecs(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}min ${s}s` : `${m}min`;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function ConversationMetrics({ conv }: { conv: ChatConversation }) {
  const stats = useMemo(() => {
    const startMs = new Date(conv.startedAt).getTime();
    const endMs = new Date(conv.endedAt).getTime();
    const durationMs = Math.max(0, endMs - startMs);
    const durationSecs = Math.round(durationMs / 1000);
    const durationHours = durationMs / 3600000;
    const pace =
      durationHours >= 0.05
        ? Math.round((conv.messageCount / durationHours) * 10) / 10
        : conv.messageCount;

    let maxGapSecs = 0;
    let lastInboundAt: number | null = null;
    for (const msg of conv.messages) {
      if (!msg.fromMe) {
        lastInboundAt = new Date(msg.sentAt).getTime();
      } else if (lastInboundAt !== null) {
        const gap = Math.round((new Date(msg.sentAt).getTime() - lastInboundAt) / 1000);
        if (gap > maxGapSecs) maxGapSecs = gap;
        lastInboundAt = null;
      }
    }

    const startDate = new Date(conv.startedAt);
    const startDayLabel = startDate.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    const startHour = startDate.getHours();

    return { durationSecs, pace, maxGapSecs, startDayLabel, startHour };
  }, [conv]);

  const items: { label: string; value: string }[] = [
    { label: 'Duração', value: formatSecs(stats.durationSecs) },
    { label: 'Recebidas', value: String(conv.inboundCount) },
    { label: 'Enviadas', value: String(conv.outboundCount) },
    ...(conv.firstResponseTimeSecs != null
      ? [{ label: 'TMP', value: formatSecs(conv.firstResponseTimeSecs) }]
      : []),
    { label: 'Ritmo', value: `${stats.pace} msg/h` },
    ...(stats.maxGapSecs > 60
      ? [{ label: 'Maior intervalo', value: formatSecs(stats.maxGapSecs) }]
      : []),
    { label: 'Início', value: `${stats.startHour}h · ${stats.startDayLabel}` },
  ];

  return (
    <div className="cv-metrics-panel">
      <div className="cv-metrics-grid">
        {items.map(({ label, value }) => (
          <div key={label} className="cv-metric-item">
            <span className="cv-metric-label">{label}</span>
            <span className="cv-metric-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentimentIcon({ sentiment }: { sentiment: ConversationSummary['sentiment'] }) {
  if (sentiment === 'positivo') return <CheckCircle2 size={13} style={{ color: '#0f9d75' }} />;
  if (sentiment === 'negativo') return <XCircle size={13} style={{ color: '#ef4444' }} />;
  return <MinusCircle size={13} style={{ color: '#9ca3af' }} />;
}

function ConversationAISummary({ summary }: { summary: ConversationSummary }) {
  const sentimentLabel = { positivo: 'Positivo', neutro: 'Neutro', negativo: 'Negativo' }[summary.sentiment];
  const sentimentClass = `cv-summary-sentiment-${summary.sentiment}`;
  return (
    <div className="cv-ai-summary-panel">
      <div className="cv-ai-summary-header">
        <span className="cv-ai-summary-topic">{summary.topic}</span>
        <span className={`cv-summary-sentiment ${sentimentClass}`}>
          <SentimentIcon sentiment={summary.sentiment} />
          {sentimentLabel}
        </span>
      </div>
      <p className="cv-ai-summary-text">{summary.summary}</p>
      {summary.keyPoints?.length > 0 && (
        <ul className="cv-ai-summary-points">
          {summary.keyPoints.map((pt, i) => (
            <li key={i}>{pt}</li>
          ))}
        </ul>
      )}
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
  const [showMetrics, setShowMetrics] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMap, setSummaryMap] = useState<Record<string, ConversationSummary>>(() => {
    const initial: Record<string, ConversationSummary> = {};
    for (const c of conversations) {
      if (c.aiSummary) initial[c.id] = c.aiSummary;
    }
    return initial;
  });
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
    setShowMetrics(false);
    setShowAISummary(false);
  }, [selectedId]);

  useEffect(() => {
    setSummaryMap((prev) => {
      const next = { ...prev };
      for (const c of conversations) {
        if (c.aiSummary && !next[c.id]) next[c.id] = c.aiSummary;
      }
      return next;
    });
  }, [conversations]);

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

  async function generateSummary(convId: string) {
    setSummaryLoading(true);
    setShowAISummary(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/summary`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as ConversationSummary;
        setSummaryMap((prev) => ({ ...prev, [convId]: data }));
      }
    } finally {
      setSummaryLoading(false);
    }
  }

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
                        {conv.channelLabel && (
                          <span className="cv-channel-badge">{conv.channelLabel}</span>
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
              {selected.channelLabel && (
                <span className="cv-channel-badge">{selected.channelLabel}</span>
              )}
              <span className="cv-chip-stat">{selected.messageCount} msgs</span>
              {selected.firstResponseTimeSecs != null && (
                <span className="cv-chip-stat">
                  TMP {Math.round(selected.firstResponseTimeSecs / 60)}min
                </span>
              )}
              <button
                className={`cv-chip-metrics${showMetrics ? ' cv-chip-metrics-active' : ''}`}
                onClick={() => setShowMetrics((v) => !v)}
                title="Ver métricas da conversa"
              >
                <BarChart2 size={11} /> Métricas
              </button>
              <button
                className={`cv-chip-metrics${showAISummary ? ' cv-chip-metrics-active' : ''}`}
                onClick={() => {
                  if (summaryMap[selected.id]) {
                    setShowAISummary((v) => !v);
                  } else {
                    void generateSummary(selected.id);
                  }
                }}
                disabled={summaryLoading}
                title="Gerar resumo com IA"
              >
                <Sparkles size={11} />
                {summaryLoading ? 'Gerando…' : 'Resumo IA'}
              </button>
              <span className="cv-chip-readonly" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={11} /> Somente leitura
              </span>
            </div>
          </div>

          {showMetrics && <ConversationMetrics conv={selected} />}
          {showAISummary && (
            summaryLoading
              ? <div className="cv-metrics-panel" style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Analisando conversa com IA…</div>
              : summaryMap[selected.id]
                ? <ConversationAISummary summary={summaryMap[selected.id]} />
                : null
          )}

          <div className="cv-thread" ref={threadRef}>
            {selected.messagesTruncated && (
              <div className="cv-truncation-notice">
                Exibindo as últimas 500 mensagens desta conversa.
              </div>
            )}
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
