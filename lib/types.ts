export type ChatMessage = {
  id: string;
  fromMe: boolean;
  sentAt: string;
  textContent: string | null;
  messageType: 'text' | 'audio' | 'image' | 'document' | 'video' | 'sticker' | 'unknown';
  mediaCaption?: string | null;
  mediaFileName?: string | null;
  mediaMimetype?: string | null;
  mediaDuration?: number | null;
  mediaSize?: number | null;
};

export type ConversationSummary = {
  topic: string;
  sentiment: 'positivo' | 'neutro' | 'negativo';
  summary: string;
  keyPoints: string[];
};

export type ChatConversation = {
  id: string;
  remoteJid: string;
  contactName: string;
  startedAt: string;
  endedAt: string;
  messageCount: number;
  inboundCount: number;
  outboundCount: number;
  firstResponseTimeSecs?: number | null;
  messages: ChatMessage[];
  messagesTruncated: boolean;
  aiSummary: ConversationSummary | null;
};

export type ReportAvailability = {
  minimumDaysMet: boolean;
  earliestAnalyzableAt: string | null;
  collectedDays: number;
};

export type DashboardInstance = {
  id: string;
  label: string;
  evolutionName: string;
  status: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  connectedAt: string | null;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  reportAvailability: ReportAvailability;
  conversationCount: number;
  messageCount: number;
};

export type DashboardClient = {
  id: string;
  name: string;
  slug: string;
  sector: string;
  instances: DashboardInstance[];
};

export type QuantitativePreview = {
  totalConversations: number;
  totalMessages: number;
  responseRate: number;
  averageFirstResponseMinutes: number;
  averageMessagesPerConversation: number;
};

export type QualitativePreview = {
  patterns: string[];
  opportunities: string[];
  objections: string[];
};

export type ResponseTimeBucket = {
  label: string;
  count: number;
  percentage: number;
  color: string;
};

export type TmpByHour = {
  hourRange: string;
  avgMinutes: number;
  count: number;
};

export type VolumeByDate = {
  date: string;
  dayOfWeek: string;
  count: number;
  isPeak: boolean;
};

export type QuantitativeReport = {
  period: { from: string | null; to: string };
  // Totais
  totalConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  inboundPercent: number;
  outboundPercent: number;
  proactivityRatio: number;
  dailyAverage: number;
  // Resposta
  responseRate: number;
  noResponseCount: number;
  averageFirstResponseMinutes: number | null;
  medianFirstResponseMinutes: number | null;
  averageMessagesPerConversation: number;
  // Distribuições
  byHour: { hour: number; count: number }[];
  byDayOfWeek: { day: number; label: string; count: number }[];
  responseTimeBuckets: ResponseTimeBucket[];
  tmpByHour: TmpByHour[];
  volumeByDate: VolumeByDate[];
  benchmarks: { tmpIdealMinutes: number; minResponseRate: number };
};
