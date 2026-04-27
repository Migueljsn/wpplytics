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

const SYSTEM_PROMPT = `Você é um analista especialista em atendimento comercial via WhatsApp.
Analise as conversas abaixo e retorne um JSON com os seguintes campos:
- summary: resumo executivo do período em 2-3 frases diretas
- tone: avaliação do tom geral das conversas (ex: "Informal e receptivo, mas com demora nas respostas")
- objections: lista das principais objeções dos clientes (máx 8 itens, strings curtas e específicas)
- opportunities: oportunidades de melhoria ou conversão identificadas (máx 8 itens)
- patterns: padrões de comportamento ou perguntas recorrentes (máx 8 itens)
- recommendations: recomendações práticas e concretas para melhorar o atendimento (máx 6 itens)

Seja específico, prático e baseado nos dados. Responda sempre em português brasileiro.
Retorne SOMENTE o JSON, sem markdown.`;

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

  // Create AnalysisRun record
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
    // Fetch conversations + messages
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

    const userMessage = `Período: ${fromDate ? fromDate.toLocaleDateString('pt-BR') : 'todo o histórico'} até ${toDate.toLocaleDateString('pt-BR')}\nTotal de conversas: ${conversationsCount}\n\nCONVERSAS:\n${text}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1500,
      temperature: 0.4,
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
