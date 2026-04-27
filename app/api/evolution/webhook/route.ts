import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { isMessageEvent, parseEvolutionWebhookPayload } from '@/lib/evolution';

export async function GET(request: NextRequest) {
  const signature =
    request.headers.get('x-evolution-secret') ?? request.nextUrl.searchParams.get('secret');

  if (signature !== env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Webhook Evolution pronto para receber eventos.',
    endpoint: '/api/evolution/webhook',
  });
}

export async function POST(request: NextRequest) {
  const signature =
    request.headers.get('x-evolution-secret') ?? request.nextUrl.searchParams.get('secret');
  if (signature !== env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const payload = parseEvolutionWebhookPayload(body);

  if (isMessageEvent(payload.event)) {
    // TODO: persistir webhook bruto, normalizar mensagens e consolidar conversas.
  }

  return NextResponse.json({
    ok: true,
    event: payload.event,
    instance: payload.instance,
  });
}
