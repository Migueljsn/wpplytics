export type ChatMessage = {
  id: string;
  fromMe: boolean;
  sentAt: string;
  textContent: string;
  messageType: 'text' | 'audio' | 'image' | 'document' | 'unknown';
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
