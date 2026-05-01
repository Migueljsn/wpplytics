import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';

const SYSTEM_PROMPT = `Você é um analista de atendimento comercial via WhatsApp. Analise a conversa abaixo e retorne um JSON com:
{
  "topic": "Assunto principal em 3-5 palavras",
  "sentiment": "positivo" | "neutro" | "negativo",
  "summary": "Resumo da conversa em 2-3 frases diretas descrevendo o que aconteceu e o resultado",
  "keyPoints": ["ponto relevante 1", "ponto relevante 2"]
}
- "keyPoints" tem no máximo 3 itens, apenas os mais relevantes para a operação
- "sentiment" reflete o tom do cliente e o desfecho da conversa
- Retorne SOMENTE o JSON, sem markdown
- Responda em português brasileiro`;

type Params = { params: Promise<{ convId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { convId } = await params;

  const conv = await prisma.conversation.findUnique({ where: { id: convId } });
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      instanceId: conv.instanceId,
      remoteJid: conv.remoteJid,
      sentAt: { gte: conv.startedAt, lte: conv.endedAt },
      textContent: { not: null },
    },
    orderBy: { sentAt: 'asc' },
    take: 30,
    select: { fromMe: true, textContent: true },
  });

  const textMsgs = messages.filter((m) => m.textContent?.trim());
  if (textMsgs.length < 2) {
    return NextResponse.json({ error: 'insufficient_messages' }, { status: 422 });
  }

  const transcript = textMsgs
    .map((m) => `${m.fromMe ? '[Atendente]' : '[Cliente]'} ${m.textContent!.trim()}`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    max_tokens: 400,
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const result = JSON.parse(raw) as Record<string, unknown>;

  await prisma.conversation.update({
    where: { id: convId },
    data: { summary: JSON.stringify(result) },
  });

  return NextResponse.json(result);
}
