import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeMessageType(type: string): 'text' | 'audio' | 'image' | 'document' | 'video' | 'sticker' | 'unknown' {
  if (type === 'conversation' || type === 'extendedTextMessage') return 'text';
  if (type === 'audioMessage' || type === 'pttMessage') return 'audio';
  if (type === 'imageMessage') return 'image';
  if (type === 'documentMessage' || type === 'documentWithCaptionMessage') return 'document';
  if (type === 'videoMessage') return 'video';
  if (type === 'stickerMessage') return 'sticker';
  return 'unknown';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ convId: string }> },
) {
  const { convId } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id: convId },
    select: { instanceId: true, remoteJid: true, startedAt: true, endedAt: true },
  });

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      instanceId: conv.instanceId,
      remoteJid: conv.remoteJid,
      sentAt: { gte: conv.startedAt, lte: conv.endedAt },
    },
    orderBy: { sentAt: 'desc' },
    take: 500,
  });

  return NextResponse.json({
    messages: messages.reverse().map((msg) => ({
      id: msg.id,
      fromMe: msg.fromMe,
      sentAt: msg.sentAt.toISOString(),
      textContent: msg.textContent,
      messageType: normalizeMessageType(msg.messageType),
      mediaCaption: msg.mediaCaption,
      mediaFileName: msg.mediaFileName,
      mediaMimetype: msg.mediaMimetype,
      mediaDuration: msg.mediaDuration,
      mediaSize: msg.mediaSize,
    })),
    truncated: messages.length === 500,
  });
}
