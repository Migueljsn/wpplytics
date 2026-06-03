import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { instanceId } = await params;
  const inst = await prisma.waInstance.findUnique({
    where: { id: instanceId },
    select: { status: true },
  });

  if (!inst) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ status: inst.status });
}
