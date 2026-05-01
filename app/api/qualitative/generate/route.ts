import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';

type RequestBody = {
  clientId: string;
  instanceId: string;
  from: string | null;
  to: string;
};

function buildConversationText(
  conversations: Array<{
    remoteJid: string;
    contactName: string;
    startedAt: Date;
    messageCount: number;
    messages: Array<{ fromMe: boolean; textContent: string | null; sentAt: Date }>;
  }>,
): { text: string; conversationsCount: number; messagesCount: number } {
  let text = '';
  let messagesCount = 0;

  for (const conv of conversations) {
    const textMsgs = conv.messages.filter((m) => m.textContent?.trim());
    if (textMsgs.length === 0) continue;

    const date = conv.startedAt.toLocaleDateString('pt-BR');
    text += `\n--- Conversa com ${conv.contactName} (${date}, ${conv.messageCount} msgs) ---\n`;

    for (const msg of textMsgs.slice(0, 25)) {
      const role = msg.fromMe ? '[Atendente]' : '[Cliente]';
      text += `${role} ${msg.textContent!.trim().slice(0, 300)}\n`;
      messagesCount++;
    }
  }

  return { text, conversationsCount: conversations.length, messagesCount };
}

const SYSTEM_PROMPT = `Você é um consultor especialista em atendimento comercial via WhatsApp, com experiência em análise de conversas para negócios de serviços.

Analise as conversas fornecidas e retorne um JSON estritamente estruturado conforme abaixo. Seja específico, cite exemplos reais das conversas (nome + número quando disponível), e baseie cada conclusão em evidências concretas dos dados.

JSON obrigatório:
{
  "mainDiscovery": {
    "insight": "A principal descoberta ou problema crítico do período em 1-2 frases impactantes e diretas",
    "urgency": "alta" | "média" | "baixa",
    "impactEstimate": "Estimativa do impacto em conversão, retenção ou satisfação. Ex: '25-30% de melhora potencial em conversão'",
    "relatedMetric": "Métrica relacionada à descoberta. Ex: 'TMP médio', 'Taxa de resposta', 'Retenção de clientes'"
  },
  "winningPatterns": [
    {
      "name": "Nome curto e descritivo do padrão que funciona bem",
      "effectiveness": "alta" | "média" | "baixa",
      "description": "Descrição detalhada de como esse padrão aparece nas conversas e por que é eficaz para o negócio",
      "examples": ["Nome do Contato - número completo"]
    }
  ],
  "opportunities": [
    {
      "title": "Título claro da oportunidade de melhoria identificada",
      "examples": ["Nome do Contato - número completo"],
      "recommendedSolution": "Solução prática e concreta que pode ser implementada imediatamente no atendimento"
    }
  ],
  "objections": [
    {
      "type": "Categoria da objeção (ex: Preço, Agenda, Indecisão, Concorrente)",
      "count": 0,
      "description": "Como essa objeção aparece nas conversas e como está sendo tratada atualmente pela equipe",
      "severity": "alta" | "média" | "baixa"
    }
  ],
  "antiObjectionScripts": [
    {
      "objection": "Tipo da objeção (mesmo nome do campo type acima)",
      "strategy": "Estratégia recomendada em uma frase clara",
      "templateResponse": "Template de resposta pronto para usar no WhatsApp, entre aspas duplas, personalizado para o contexto real do negócio identificado nas conversas",
      "expectedOutcome": "Resultado esperado ao usar esse script com os clientes"
    }
  ],
  "tone": "Avaliação do tom geral das conversas em 1-2 frases: formalidade, receptividade, velocidade de resposta, calor humano",
  "summary": "Resumo executivo do período em 3-4 frases diretas destacando os achados mais críticos e o estado geral do atendimento"
}

Regras obrigatórias:
- Retorne SOMENTE o JSON, sem markdown, sem texto fora do JSON
- winningPatterns: 1 a 4 itens (pelo menos 1 sempre)
- opportunities: 1 a 4 itens
- objections: 1 a 6 itens, com "count" real baseado nas conversas analisadas
- antiObjectionScripts: apenas para objeções com severity "alta" ou "média"; pode ser array vazio
- examples: use nomes e números reais das conversas; se não houver número visível, use só o nome
- Responda sempre em português brasileiro
- Se dados insuficientes para um campo, use array vazio [] ou string descritiva`;

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, instanceId, from, to } = body;
  if (!clientId || !instanceId) {
    return NextResponse.json({ error: 'clientId and instanceId required' }, { status: 400 });
  }

  const fromDate = from ? new Date(from) : null;
  const toDate = new Date(to);
  const dateFilter = fromDate ? { gte: fromDate, lte: toDate } : undefined;

  const run = await prisma.analysisRun.create({
    data: {
      clientId,
      instanceId,
      type: 'QUALITATIVE',
      status: 'PROCESSING',
      startDate: fromDate ?? new Date(0),
      endDate: toDate,
      minimumDaysMet: true,
    },
  });

  try {
    const conversations = await prisma.conversation.findMany({
      where: { instanceId, ...(dateFilter ? { startedAt: dateFilter } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 60,
      include: { contact: true },
    });

    const withMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await prisma.message.findMany({
          where: { instanceId, remoteJid: conv.remoteJid, ...(dateFilter ? { sentAt: dateFilter } : {}) },
          orderBy: { sentAt: 'asc' },
          take: 30,
          select: { fromMe: true, textContent: true, sentAt: true },
        });
        return {
          remoteJid: conv.remoteJid,
          contactName: conv.contact?.displayName ?? conv.remoteJid.split('@')[0],
          startedAt: conv.startedAt,
          messageCount: conv.messageCount,
          messages,
        };
      }),
    );

    const { text, conversationsCount, messagesCount } = buildConversationText(withMessages);

    if (!text.trim()) {
      await prisma.analysisRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', errorMessage: 'Sem mensagens de texto no período selecionado.', completedAt: new Date() },
      });
      return NextResponse.json({ error: 'no_text_messages' }, { status: 422 });
    }

    const userMessage = `Período: ${fromDate ? fromDate.toLocaleDateString('pt-BR') : 'todo o histórico'} até ${toDate.toLocaleDateString('pt-BR')}\nTotal de conversas na amostra: ${conversationsCount}\n\nCONVERSAS:\n${text}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 3000,
      temperature: 0.35,
    });

    const rawJson = completion.choices[0]?.message?.content ?? '{}';
    const result = JSON.parse(rawJson) as Record<string, unknown>;
    result.conversationsAnalyzed = conversationsCount;
    result.messagesAnalyzed = messagesCount;

    await prisma.analysisRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', reportJson: result as object, completedAt: new Date() },
    });

    return NextResponse.json({ runId: run.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.analysisRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
