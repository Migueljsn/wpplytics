import { NextRequest, NextResponse } from 'next/server';
import { type WaInstance } from '@prisma/client';
import { env } from '@/lib/env';
import { parseEvolutionWebhookPayload } from '@/lib/evolution';
import { prisma } from '@/lib/prisma';

function secret(request: NextRequest) {
  return request.headers.get('x-evolution-secret') ?? request.nextUrl.searchParams.get('secret');
}

async function handleConnectionUpdate(instanceId: string, data: Record<string, unknown>) {
  const state = (data?.instance as Record<string, unknown>)?.state ?? data?.state;
  if (!state) return;

  const status =
    state === 'open' ? 'CONNECTED' :
    state === 'close' ? 'DISCONNECTED' :
    'ERROR' as const;

  await prisma.waInstance.update({
    where: { id: instanceId },
    data: {
      status,
      ...(status === 'CONNECTED' ? { connectedAt: new Date() } : {}),
    },
  });
}

async function handleMessagesUpsert(waInstance: WaInstance, data: unknown) {
  const rawMessages = Array.isArray(data) ? data : [data];
  let earliestSentAt: Date | null = null;
  let latestSentAt: Date | null = null;

  for (const msg of rawMessages as Record<string, unknown>[]) {
    try {
      const msgKey = msg?.key as Record<string, unknown> | undefined;
      const msgId = msgKey?.id as string | undefined;
      const remoteJid = msgKey?.remoteJid as string | undefined;
      if (!msgId || !remoteJid) continue;

      const fromMe = Boolean(msgKey?.fromMe);
      const ts = msg?.messageTimestamp;
      const sentAt = ts ? new Date(Number(ts) * 1000) : new Date();

      if (!earliestSentAt || sentAt < earliestSentAt) earliestSentAt = sentAt;
      if (!latestSentAt || sentAt > latestSentAt) latestSentAt = sentAt;

      // Upsert contact for inbound non-group messages
      const isGroup = remoteJid.includes('@g.us');
      let contact = null;
      if (!fromMe && !isGroup) {
        const pushName = msg?.pushName as string | undefined;
        contact = await prisma.contact.upsert({
          where: { remoteJid },
          update: { displayName: pushName ?? undefined },
          create: {
            remoteJid,
            displayName: pushName ?? null,
            phoneNumber: remoteJid.split('@')[0] ?? null,
          },
        });
      }

      // Create message — skip if duplicate
      const msgData = msg?.message as Record<string, unknown> | undefined;
      const extMsg = msgData?.extendedTextMessage as Record<string, unknown> | undefined;
      const textContent =
        (msgData?.conversation as string | undefined) ??
        (extMsg?.text as string | undefined) ??
        null;

      try {
        await prisma.message.create({
          data: {
            instanceId: waInstance.id,
            contactId: contact?.id ?? null,
            evolutionMsgId: msgId,
            remoteJid,
            fromMe,
            sentAt,
            messageType: (msg?.messageType as string) ?? 'unknown',
            textContent,
            rawPayload: msg as object,
          },
        });
      } catch {
        continue;
      }

      // Upsert conversation
      const conv = await prisma.conversation.findFirst({
        where: { instanceId: waInstance.id, remoteJid },
        orderBy: { startedAt: 'desc' },
      });

      if (conv) {
        const newDirection =
          (fromMe && conv.inboundCount > 0) || (!fromMe && conv.outboundCount > 0)
            ? 'MIXED'
            : conv.direction;

        // Calculate firstResponseTimeSecs: first outbound after at least one inbound
        const firstResponseTimeSecs =
          fromMe && conv.inboundCount > 0 && conv.firstResponseTimeSecs === null
            ? Math.round((sentAt.getTime() - conv.startedAt.getTime()) / 1000)
            : undefined;

        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            endedAt: sentAt,
            messageCount: { increment: 1 },
            ...(fromMe ? { outboundCount: { increment: 1 } } : { inboundCount: { increment: 1 } }),
            direction: newDirection,
            contactId: contact?.id ?? conv.contactId ?? undefined,
            ...(firstResponseTimeSecs !== undefined ? { firstResponseTimeSecs, firstResponseAt: sentAt } : {}),
          },
        });
      } else {
        await prisma.conversation.create({
          data: {
            instanceId: waInstance.id,
            contactId: contact?.id ?? null,
            remoteJid,
            startedAt: sentAt,
            endedAt: sentAt,
            messageCount: 1,
            inboundCount: fromMe ? 0 : 1,
            outboundCount: fromMe ? 1 : 0,
            direction: fromMe ? 'OUTBOUND' : 'INBOUND',
          },
        });
      }
    } catch (err) {
      console.error('[webhook] error processing message:', err);
    }
  }

  if (latestSentAt) {
    await prisma.waInstance.update({
      where: { id: waInstance.id },
      data: {
        firstMessageAt: waInstance.firstMessageAt ?? earliestSentAt,
        lastMessageAt: latestSentAt,
      },
    });
  }
}

export async function GET(request: NextRequest) {
  if (secret(request) !== env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    message: 'Webhook Evolution pronto para receber eventos.',
    endpoint: '/api/evolution/webhook',
  });
}

export async function POST(request: NextRequest) {
  if (secret(request) !== env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = parseEvolutionWebhookPayload(body);

  const waInstance = await prisma.waInstance.findUnique({
    where: { evolutionName: payload.instance },
  });

  await prisma.webhookEvent.create({
    data: {
      instanceId: waInstance?.id ?? null,
      eventName: payload.event,
      payload: body as object,
    },
  });

  if (payload.event === 'connection.update' && waInstance && payload.data) {
    await handleConnectionUpdate(waInstance.id, payload.data as Record<string, unknown>);
  }

  if (payload.event === 'messages.upsert' && waInstance && payload.data) {
    await handleMessagesUpsert(waInstance, payload.data);
  }

  return NextResponse.json({ ok: true, event: payload.event, instance: payload.instance });
}
