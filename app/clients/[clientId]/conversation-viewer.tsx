'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Lock, EyeOff, RefreshCw, Mic, FileText, Video, Paperclip, X, Download, Search, BarChart2, Sparkles, CheckCircle2, MinusCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import type { ChatConversation, ChatMessage, ConversationSummary } from '@/lib/types';
import type { SearchResult } from '@/app/api/conversations/search/route';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min — só atualiza lista, não mensagens

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

function MediaBubble({ msg }: { msg: ChatMessage }) {
  const src = `/api/media/${msg.id}`;

  const iconMap: Record<string, React.ReactNode> = {
    audio:    <Mic size={16} className="cv-media-icon" />,
    image:    <ImageIcon size={16} className="cv-media-icon" />,
    video:    <Video size={16} className="cv-media-icon" />,
    document: <FileText size={16} className="cv-media-icon" />,
    sticker:  <Paperclip size={16} className="cv-media-icon" />,
  };
  const labelMap: Record<string, string> = {
    audio: 'Áudio', image: 'Imagem', video: 'Vídeo',
    document: msg.mediaFileName ?? 'Documento', sticker: 'Sticker',
  };

  const icon = iconMap[msg.messageType] ?? <Paperclip size={16} className="cv-media-icon" />;
  const label = labelMap[msg.messageType] ?? 'Arquivo';
  const meta = [
    msg.mediaDuration ? formatDuration(msg.mediaDuration) : null,
    msg.mediaSize ? formatBytes(msg.mediaSize) : null,
  ].filter(Boolean).join(' · ');

  return (
    <a href={src} download={msg.mediaFileName ?? true} className="cv-media-doc" target="_blank" rel="noreferrer">
      {icon}
      <div className="cv-media-doc-info">
        <span className="cv-media-doc-name">{label}</span>
        {meta && <span className="cv-media-meta">{meta}</span>}
        {msg.mediaCaption && <span className="cv-media-meta">{msg.mediaCaption}</span>}
      </div>
      <Download size={14} className="cv-media-dl" />
    </a>
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

export function ConversationViewer({ conversations, instanceId }: { conversations: ChatConversation[]; instanceId: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(conversations.map((c) => c.id)));
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [messagesMap, setMessagesMap] = useState<Record<string, { messages: ChatMessage[]; truncated: boolean }>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
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
  const selectedConv = visible.find((c) => c.id === selectedId) ?? null;
  const selectedMessages = selectedId ? (messagesMap[selectedId] ?? null) : null;
  const selected = selectedConv ? {
    ...selectedConv,
    messages: selectedMessages?.messages ?? [],
    messagesTruncated: selectedMessages?.truncated ?? false,
    messagesLoaded: selectedId !== null && selectedId in messagesMap,
  } : null;

  async function loadMessages(convId: string) {
    if (convId in messagesMap) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json() as { messages: ChatMessage[]; truncated: boolean };
        setMessagesMap((prev) => ({ ...prev, [convId]: data }));
      }
    } finally {
      setLoadingMessages(false);
    }
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations/search?instanceId=${encodeURIComponent(instanceId)}&q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setSearchResults(await res.json() as SearchResult);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }

  // Keep memoized flag for whether we're in search mode
  const isSearching = useMemo(() => searchQuery.trim().length >= 2, [searchQuery]);

  useEffect(() => {
    setVisibleIds(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  // Load messages for first conversation on mount
  useEffect(() => {
    if (conversations[0]?.id) void loadMessages(conversations[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!selectedId) return;
    void loadMessages(selectedId);
    if (threadRef.current && isAtBottomRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
    setShowMetrics(false);
    setShowAISummary(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <button
              className="cv-sync-label"
              style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => { router.refresh(); setLastUpdated(new Date()); setSecondsAgo(0); }}
              title="Atualizar lista"
            >
              <RefreshCw size={11} className={secondsAgo < 5 ? 'spin-icon' : ''} style={{ opacity: 0.6 }} />
              {secondsAgo < 5 ? 'agora' : `${Math.floor(secondsAgo / 60) > 0 ? `${Math.floor(secondsAgo / 60)}m` : `${secondsAgo}s`}`}
            </button>
          </div>
        </div>
        <div className="cv-search-bar">
          <Search size={13} className="cv-search-icon" />
          <input
            type="text"
            className="cv-search-input"
            placeholder="Buscar contato ou mensagem…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchLoading && <RefreshCw size={12} className="cv-search-icon spin-icon" style={{ right: 8, left: 'auto' }} />}
          {searchQuery && !searchLoading && (
            <button className="cv-search-clear" onClick={() => { handleSearchChange(''); setSearchResults(null); }} aria-label="Limpar busca">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="cv-list-scroll">
          {isSearching ? (
            !searchResults ? (
              <div className="cv-search-empty">{searchLoading ? 'Buscando…' : 'Digite para buscar'}</div>
            ) : searchResults.contacts.length === 0 && searchResults.messages.length === 0 ? (
              <div className="cv-search-empty">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <>
                {searchResults.contacts.length > 0 && (
                  <>
                    <div className="cv-search-section">Contatos · {searchResults.contacts.length}</div>
                    {searchResults.contacts.map((result) => (
                      <div key={result.id} className={`cv-row-wrap${result.id === selectedId ? ' cv-row-wrap-active' : ''}`}>
                        <button className="cv-row" onClick={() => setSelectedId(result.id)}>
                          <div className="cv-avatar cv-avatar-sm">{initials(result.contactName)}</div>
                          <div className="cv-row-body">
                            <div className="cv-row-head">
                              <span className="cv-row-name">{result.contactName}</span>
                              <span className="cv-row-time">{formatLastTime(result.endedAt)}</span>
                            </div>
                            <p className="cv-row-preview">{result.remoteJid.split('@')[0]}</p>
                          </div>
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.messages.length > 0 && (
                  <>
                    <div className="cv-search-section">Mensagens · {searchResults.messages.length}</div>
                    {searchResults.messages.map((result) => {
                      const s = makeSnippet(result.snippet, searchQuery);
                      return (
                        <div key={result.convId} className={`cv-row-wrap${result.convId === selectedId ? ' cv-row-wrap-active' : ''}`}>
                          <button
                            className="cv-row"
                            onClick={() => setSelectedId(result.convId)}
                          >
                            <div className="cv-avatar cv-avatar-sm">{initials(result.contactName)}</div>
                            <div className="cv-row-body">
                              <div className="cv-row-head">
                                <span className="cv-row-name">{result.contactName}</span>
                                <span className="cv-row-time">{formatLastTime(result.endedAt)}</span>
                              </div>
                              <p className="cv-search-snippet">
                                {result.fromMe && <span className="cv-me">Você: </span>}
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
                        {conv.lastMessageFromMe && <span className="cv-me">Você: </span>}
                        {conv.lastMessagePreview ?? '—'}
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
            {loadingMessages && !selected.messagesLoaded ? (
              <div className="cv-messages-loading">
                <RefreshCw size={16} className="spin-icon" style={{ opacity: 0.5 }} />
                <span>Carregando mensagens…</span>
              </div>
            ) : (
              <>
                {selected.messagesTruncated && (
                  <div className="cv-truncation-notice">
                    Exibindo as últimas 500 mensagens desta conversa.
                  </div>
                )}
                {renderMessages(selected.messages)}
              </>
            )}
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
