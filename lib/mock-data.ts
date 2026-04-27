import type {
  ChatConversation,
  DashboardClient,
  QualitativePreview,
  QuantitativePreview,
} from '@/lib/types';
import { getReportAvailability } from '@/lib/report-availability';

const now = new Date('2026-04-24T12:00:00.000Z');
const firstMessageAt = new Date('2026-04-18T10:12:00.000Z');

export const mockConversations: ChatConversation[] = [
  {
    id: 'conv_1',
    remoteJid: '5585991110001@s.whatsapp.net',
    contactName: 'Mariana Silva',
    startedAt: '2026-04-23T13:00:00.000Z',
    endedAt: '2026-04-23T13:16:00.000Z',
    messageCount: 6,
    inboundCount: 3,
    outboundCount: 3,
    firstResponseTimeSecs: 520,
    messages: [
      {
        id: 'm1',
        fromMe: false,
        sentAt: '2026-04-23T13:00:00.000Z',
        textContent: 'Boa tarde. Queria entender o valor da consulta online.',
        messageType: 'text',
      },
      {
        id: 'm2',
        fromMe: true,
        sentAt: '2026-04-23T13:08:40.000Z',
        textContent:
          'Boa tarde, Mariana. A consulta online custa R$ 320 e pode ser parcelada. Se fizer sentido, eu ja te envio os horarios desta semana.',
        messageType: 'text',
      },
      {
        id: 'm3',
        fromMe: false,
        sentAt: '2026-04-23T13:10:00.000Z',
        textContent: 'Tem algo para quinta no fim da tarde?',
        messageType: 'text',
      },
      {
        id: 'm4',
        fromMe: true,
        sentAt: '2026-04-23T13:11:20.000Z',
        textContent: 'Temos 17h10 e 18h. Posso segurar uma das duas para voce.',
        messageType: 'text',
      },
      {
        id: 'm5',
        fromMe: false,
        sentAt: '2026-04-23T13:14:00.000Z',
        textContent: 'Pode reservar 18h entao.',
        messageType: 'text',
      },
      {
        id: 'm6',
        fromMe: true,
        sentAt: '2026-04-23T13:16:00.000Z',
        textContent: 'Fechado. Vou te mandar agora o passo a passo da confirmacao.',
        messageType: 'text',
      },
    ],
  },
  {
    id: 'conv_2',
    remoteJid: '5585991110002@s.whatsapp.net',
    contactName: 'Carlos Eduardo',
    startedAt: '2026-04-22T14:32:00.000Z',
    endedAt: '2026-04-22T16:10:00.000Z',
    messageCount: 5,
    inboundCount: 3,
    outboundCount: 2,
    firstResponseTimeSecs: 4320,
    messages: [
      {
        id: 'm7',
        fromMe: false,
        sentAt: '2026-04-22T14:32:00.000Z',
        textContent: 'Oi. Meu convenio cobre ou e particular?',
        messageType: 'text',
      },
      {
        id: 'm8',
        fromMe: true,
        sentAt: '2026-04-22T15:44:00.000Z',
        textContent:
          'Hoje o atendimento e particular, mas posso te detalhar valores e as formas de pagamento para voce avaliar com calma.',
        messageType: 'text',
      },
      {
        id: 'm9',
        fromMe: false,
        sentAt: '2026-04-22T15:45:30.000Z',
        textContent: 'Entendi. E qual a diferenca da consulta online?',
        messageType: 'text',
      },
      {
        id: 'm10',
        fromMe: true,
        sentAt: '2026-04-22T15:49:00.000Z',
        textContent:
          'A consulta online mantem a mesma conducao clinica e ja inclui orientacoes posteriores. Se quiser, eu te mando a agenda.',
        messageType: 'text',
      },
      {
        id: 'm11',
        fromMe: false,
        sentAt: '2026-04-22T16:10:00.000Z',
        textContent: 'Pode mandar, vou comparar aqui.',
        messageType: 'text',
      },
    ],
  },
];

const totalMessages = mockConversations.reduce((sum, conversation) => sum + conversation.messageCount, 0);

export const mockClient: DashboardClient = {
  id: 'client_aurora',
  name: 'Clinica Aurora',
  slug: 'clinica-aurora',
  sector: 'Clinica Medica',
  instances: [
    {
      id: 'inst_aurora_1',
      label: 'Aurora Principal',
      evolutionName: 'aurora-main',
      status: 'CONNECTED',
      connectedAt: '2026-04-18T09:30:00.000Z',
      firstMessageAt: firstMessageAt.toISOString(),
      lastMessageAt: '2026-04-24T11:42:00.000Z',
      reportAvailability: getReportAvailability(firstMessageAt, now),
      conversationCount: mockConversations.length,
      messageCount: totalMessages,
    },
  ],
};

export const mockQuantitativePreview: QuantitativePreview = {
  totalConversations: mockConversations.length,
  totalMessages,
  responseRate: 94.2,
  averageFirstResponseMinutes: 40.3,
  averageMessagesPerConversation: totalMessages / mockConversations.length,
};

export const mockQualitativePreview: QualitativePreview = {
  patterns: [
    'Confirmação de agenda com condução clara',
    'Atendimento consultivo com contexto',
  ],
  opportunities: [
    'Antecipar preço e pagamento em conversas de interesse comercial',
    'Reduzir tempo de primeira resposta nas faixas da tarde',
  ],
  objections: ['Preço', 'Convênio', 'Agenda'],
};
