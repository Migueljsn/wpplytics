import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { instance: { select: { evolutionName: true } } },
  });

  if (!message || !message.instance) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const baseUrl = env.EVOLUTION_API_BASE_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: 'Evolution API not configured' }, { status: 503 });
  }

  try {
    const evoRes = await fetch(
      `${baseUrl}/chat/getBase64FromMediaMessage/${message.instance.evolutionName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ message: message.rawPayload }),
      },
    );

    if (!evoRes.ok) {
      return NextResponse.json({ error: 'Media unavailable' }, { status: 404 });
    }

    const json = await evoRes.json() as { base64?: string; mimetype?: string };
    if (!json.base64) {
      return NextResponse.json({ error: 'Media unavailable' }, { status: 404 });
    }

    const binary = Buffer.from(json.base64, 'base64');
    const mime = json.mimetype ?? message.mediaMimetype ?? 'application/octet-stream';

    return new NextResponse(binary, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(binary.length),
        'Cache-Control': 'private, max-age=3600',
        ...(message.mediaFileName
          ? { 'Content-Disposition': `inline; filename="${message.mediaFileName}"` }
          : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Media unavailable' }, { status: 502 });
  }
}
