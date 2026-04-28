import { prisma } from '@/lib/prisma';
import { getReportAvailability } from '@/lib/report-availability';
import type {
  DashboardClient, ChatConversation, QuantitativePreview, QualitativePreview,
  QuantitativeReport, ResponseTimeBucket, TmpByHour, VolumeByDate,
} from '@/lib/types';

export async function getDashboardClient(clientId: string): Promise<DashboardClient | null> {
  const client = await prisma.client.findFirst({
    where: { OR: [{ id: clientId }, { slug: clientId }] },
    include: {
      instances: {
        include: {
          _count: { select: { messages: true, conversations: true } },
        },
      },
    },
  });

  if (!client) return null;

  return {
    id: client.id,
    name: client.name,
    slug: client.slug,
    sector: client.sector ?? '',
    instances: client.instances.map((inst) => ({
      id: inst.id,
      label: inst.label,
      evolutionName: inst.evolutionName,
      status: inst.status,
      connectedAt: inst.connectedAt?.toISOString() ?? null,
      firstMessageAt: inst.firstMessageAt?.toISOString() ?? null,
      lastMessageAt: inst.lastMessageAt?.toISOString() ?? null,
      reportAvailability: getReportAvailability(inst.firstMessageAt),
      conversationCount: inst._count.conversations,
      messageCount: inst._count.messages,
    })),
  };
}

function normalizeMessageType(type: string): 'text' | 'audio' | 'image' | 'document' | 'video' | 'sticker' | 'unknown' {
  if (type === 'conversation' || type === 'extendedTextMessage') return 'text';
  if (type === 'audioMessage' || type === 'pttMessage') return 'audio';
  if (type === 'imageMessage') return 'image';
  if (type === 'documentMessage' || type === 'documentWithCaptionMessage') return 'document';
  if (type === 'videoMessage') return 'video';
  if (type === 'stickerMessage') return 'sticker';
  return 'unknown';
}

export async function getInstanceConversations(
  instanceId: string,
  from: Date | null,
  to: Date,
): Promise<ChatConversation[]> {
  const dateFilter = from ? { gte: from, lte: to } : undefined;
  const conversations = await prisma.conversation.findMany({
    where: { instanceId, hidden: false, ...(dateFilter ? { startedAt: dateFilter } : {}) },
    orderBy: { endedAt: 'desc' },
    take: 50,
    include: { contact: true },
  });

  return Promise.all(
    conversations.map(async (conv) => {
      const messages = await prisma.message.findMany({
        where: { instanceId, remoteJid: conv.remoteJid },
        orderBy: { sentAt: 'asc' },
        take: 200,
      });

      return {
        id: conv.id,
        remoteJid: conv.remoteJid,
        contactName: conv.contact?.displayName ?? conv.remoteJid.split('@')[0],
        startedAt: conv.startedAt.toISOString(),
        endedAt: conv.endedAt.toISOString(),
        messageCount: conv.messageCount,
        inboundCount: conv.inboundCount,
        outboundCount: conv.outboundCount,
        firstResponseTimeSecs: conv.firstResponseTimeSecs,
        messages: messages.map((msg) => ({
          id: msg.id,
          fromMe: msg.fromMe,
          sentAt: msg.sentAt.toISOString(),
          textContent: msg.textContent ?? '',
          messageType: normalizeMessageType(msg.messageType),
          mediaCaption: msg.mediaCaption,
          mediaFileName: msg.mediaFileName,
          mediaMimetype: msg.mediaMimetype,
          mediaDuration: msg.mediaDuration,
          mediaSize: msg.mediaSize,
        })),
      };
    }),
  );
}

export async function getReportPreviews(
  instanceId: string,
  from: Date | null,
  to: Date,
): Promise<{ quantitative: QuantitativePreview; qualitative: QualitativePreview }> {
  const dateFilter = from ? { gte: from, lte: to } : undefined;
  const [conversations, messageCount] = await Promise.all([
    prisma.conversation.findMany({ where: { instanceId, ...(dateFilter ? { startedAt: dateFilter } : {}) } }),
    prisma.message.count({ where: { instanceId, ...(dateFilter ? { sentAt: dateFilter } : {}) } }),
  ]);

  const total = conversations.length;
  const responded = conversations.filter((c) => c.outboundCount > 0).length;
  const responseRate = total > 0 ? Math.round((responded / total) * 1000) / 10 : 0;

  const withTmp = conversations.filter((c) => c.firstResponseTimeSecs != null);
  const avgFirstResponseMinutes =
    withTmp.length > 0
      ? Math.round(
          (withTmp.reduce((acc, c) => acc + (c.firstResponseTimeSecs ?? 0), 0) / withTmp.length / 60) * 10,
        ) / 10
      : 0;

  const avgMessagesPerConversation = total > 0 ? Math.round((messageCount / total) * 10) / 10 : 0;

  return {
    quantitative: {
      totalConversations: total,
      totalMessages: messageCount,
      responseRate,
      averageFirstResponseMinutes: avgFirstResponseMinutes,
      averageMessagesPerConversation: avgMessagesPerConversation,
    },
    qualitative: { patterns: [], opportunities: [], objections: [] },
  };
}

export async function getQuantitativeReport(
  instanceId: string,
  from: Date | null,
  to: Date,
): Promise<QuantitativeReport> {
  const dateFilter = from ? { gte: from, lte: to } : undefined;

  const [conversations, inboundMessages] = await Promise.all([
    prisma.conversation.findMany({
      where: { instanceId, ...(dateFilter ? { startedAt: dateFilter } : {}) },
      select: {
        inboundCount: true,
        outboundCount: true,
        messageCount: true,
        firstResponseTimeSecs: true,
        startedAt: true,
      },
    }),
    prisma.message.findMany({
      where: { instanceId, fromMe: false, ...(dateFilter ? { sentAt: dateFilter } : {}) },
      select: { sentAt: true },
    }),
  ]);

  const total = conversations.length;

  // ── Mensagens recebidas vs enviadas ──
  const totalInbound = conversations.reduce((a, c) => a + c.inboundCount, 0);
  const totalOutbound = conversations.reduce((a, c) => a + c.outboundCount, 0);
  const totalMessages = totalInbound + totalOutbound;
  const inboundPercent = totalMessages > 0 ? Math.round((totalInbound / totalMessages) * 1000) / 10 : 0;
  const outboundPercent = totalMessages > 0 ? Math.round((totalOutbound / totalMessages) * 1000) / 10 : 0;
  const proactivityRatio = totalInbound > 0 ? Math.round((totalOutbound / totalInbound) * 100) / 100 : 0;

  // ── Taxa de resposta ──
  const responded = conversations.filter((c) => c.outboundCount > 0).length;
  const noResponseCount = conversations.filter(c => c.outboundCount === 0 && c.inboundCount > 0).length;
  const responseRate = total > 0 ? Math.round((responded / total) * 1000) / 10 : 0;

  // ── TMP ──
  // Filtra outliers: < 6s (bot/automático) ou > 24h
  const withTmp = conversations.filter(c => c.firstResponseTimeSecs != null);
  const validTmp = withTmp.filter(c => {
    const s = c.firstResponseTimeSecs ?? 0;
    return s >= 6 && s <= 86400;
  });

  const averageFirstResponseMinutes = validTmp.length > 0
    ? Math.round((validTmp.reduce((a, c) => a + (c.firstResponseTimeSecs ?? 0), 0) / validTmp.length / 60) * 100) / 100
    : null;

  // TMP mediano (50° percentil)
  let medianFirstResponseMinutes: number | null = null;
  if (validTmp.length > 0) {
    const sorted = [...validTmp].map(c => c.firstResponseTimeSecs!).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianSecs = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    medianFirstResponseMinutes = Math.round((medianSecs / 60) * 100) / 100;
  }

  const averageMessagesPerConversation = total > 0 ? Math.round((totalInbound / total) * 10) / 10 : 0;

  // ── Distribuição por velocidade ──
  const onlyCompany = conversations.filter(c => c.outboundCount > 0 && c.inboundCount === 0).length;
  const outlierTmp = withTmp.filter(c => {
    const s = c.firstResponseTimeSecs ?? 0;
    return s < 6 || s > 86400;
  }).length;
  const under5   = validTmp.filter(c => (c.firstResponseTimeSecs ?? 0) < 300).length;
  const bt5_15   = validTmp.filter(c => { const s = c.firstResponseTimeSecs ?? 0; return s >= 300  && s < 900;  }).length;
  const bt15_60  = validTmp.filter(c => { const s = c.firstResponseTimeSecs ?? 0; return s >= 900  && s < 3600; }).length;
  const over1h   = validTmp.filter(c => (c.firstResponseTimeSecs ?? 0) >= 3600).length;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

  const responseTimeBuckets: ResponseTimeBucket[] = [
    { label: 'Menos de 5 minutos',   count: under5,      percentage: pct(under5),      color: '#22c55e' },
    { label: 'Entre 5 e 15 minutos', count: bt5_15,      percentage: pct(bt5_15),      color: '#eab308' },
    { label: 'Entre 15 e 60 min',    count: bt15_60,     percentage: pct(bt15_60),     color: '#f97316' },
    { label: 'Mais de 1 hora',       count: over1h,      percentage: pct(over1h),      color: '#ef4444' },
    { label: 'Sem resposta',         count: noResponseCount, percentage: pct(noResponseCount), color: '#9ca3af' },
    { label: 'Só empresa enviou',    count: onlyCompany, percentage: pct(onlyCompany), color: '#3b82f6' },
    { label: 'TMP fora do padrão',   count: outlierTmp,  percentage: pct(outlierTmp),  color: '#a855f7' },
  ];

  // ── TMP por período (agrupado por hora de início da conversa) ──
  const tmpHourMap = new Map<number, number[]>();
  for (const conv of validTmp) {
    const h = new Date(conv.startedAt).getHours();
    if (!tmpHourMap.has(h)) tmpHourMap.set(h, []);
    tmpHourMap.get(h)!.push(conv.firstResponseTimeSecs!);
  }
  const tmpByHour: TmpByHour[] = Array.from(tmpHourMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([h, tmps]) => ({
      hourRange: `${String(h).padStart(2, '0')}h-${String(h + 1).padStart(2, '0')}h`,
      avgMinutes: Math.round((tmps.reduce((a, v) => a + v, 0) / tmps.length / 60) * 100) / 100,
      count: tmps.length,
    }));

  // ── Volume por data ──
  const dateMap = new Map<string, number>();
  for (const conv of conversations) {
    const d = conv.startedAt.toISOString().split('T')[0];
    dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
  }
  const dayNamesPt = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
  const maxDateCount = Math.max(...Array.from(dateMap.values()), 0);
  const volumeByDate: VolumeByDate[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoDate, count]) => {
      const [year, month, day] = isoDate.split('-');
      const d = new Date(`${isoDate}T12:00:00Z`);
      return {
        date: `${day}/${month}/${year}`,
        dayOfWeek: dayNamesPt[d.getUTCDay()],
        count,
        isPeak: count === maxDateCount && maxDateCount > 0,
      };
    });

  // ── Média diária ──
  const days = from
    ? Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)))
    : Math.max(1, volumeByDate.length);
  const dailyAverage = Math.round((total / days) * 10) / 10;

  // ── Distribuição por hora (msgs inbound) e dia da semana ──
  const hourCounts = new Array(24).fill(0) as number[];
  const dayCounts = new Array(7).fill(0) as number[];
  for (const msg of inboundMessages) {
    const d = new Date(msg.sentAt);
    hourCounts[d.getHours()]++;
    dayCounts[d.getDay()]++;
  }
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return {
    period: { from: from?.toISOString() ?? null, to: to.toISOString() },
    totalConversations: total,
    totalMessages,
    inboundMessages: totalInbound,
    outboundMessages: totalOutbound,
    inboundPercent,
    outboundPercent,
    proactivityRatio,
    dailyAverage,
    responseRate,
    noResponseCount,
    averageFirstResponseMinutes,
    medianFirstResponseMinutes,
    averageMessagesPerConversation,
    byHour: hourCounts.map((count, hour) => ({ hour, count })),
    byDayOfWeek: dayCounts.map((count, day) => ({ day, label: dayLabels[day], count })),
    responseTimeBuckets,
    tmpByHour,
    volumeByDate,
    benchmarks: { tmpIdealMinutes: 20, minResponseRate: 90 },
  };
}
