import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cleanup-secret') ?? request.nextUrl.searchParams.get('secret');
  if (secret !== env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.message.deleteMany({ where: { sentAt: { lt: cutoff } } });

  return NextResponse.json({
    ok: true,
    deletedMessages: deleted.count,
    cutoff: cutoff.toISOString(),
  });
}
