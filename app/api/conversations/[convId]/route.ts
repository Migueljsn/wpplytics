import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ convId: string }> },
) {
  const { convId } = await params;

  await prisma.conversation.update({
    where: { id: convId },
    data: { hidden: true },
  });

  return NextResponse.json({ ok: true });
}
