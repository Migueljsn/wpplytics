import { prisma } from '@/lib/prisma';
import { getReportAvailability } from '@/lib/report-availability';
import type { DashboardClient, ChatConversation, QuantitativePreview, QualitativePreview, QuantitativeReport } from '@/lib/types';

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

function normalizeMessageType(type: string): 'text' | 'audio' | 'image' | 'document' | 'unknown' {
  if (type === 'conversation' || type === 'extendedTextMessage') return 'text';
  if (type === 'audioMessage') return 'audio';
  if (type === 'imageMessage') return 'image';
  if (type === 'documentMessage') return 'document';
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
    qualitative: {
      patterns: [],
      opportunities: [],
      objections: [],
    },
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
    }),
    prisma.message.findMany({
      where: { instanceId, fromMe: false, ...(dateFilter ? { sentAt: dateFilter } : {}) },
      select: { sentAt: true },
    }),
  ]);

  const total = conversations.length;
  const responded = conversations.filter((c) => c.outboundCount > 0).length;
  const noResponseCount = total - responded;
  const responseRate = total > 0 ? Math.round((responded / total) * 1000) / 10 : 0;

  const withTmp = conversations.filter((c) => c.firstResponseTimeSecs != null);
  const averageFirstResponseMinutes =
    withTmp.length > 0
      ? Math.round(
          (withTmp.reduce((a, c) => a + (c.firstResponseTimeSecs ?? 0), 0) / withTmp.length / 60) * 10,
        ) / 10
      : null;

  const totalMessages = inboundMessages.length;
  const averageMessagesPerConversation = total > 0 ? Math.round((totalMessages / total) * 10) / 10 : 0;

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
    responseRate,
    noResponseCount,
    averageFirstResponseMinutes,
    averageMessagesPerConversation,
    byHour: hourCounts.map((count, hour) => ({ hour, count })),
    byDayOfWeek: dayCounts.map((count, day) => ({ day, label: dayLabels[day], count })),
  };
}
