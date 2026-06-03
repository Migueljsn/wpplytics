import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { evoApi } from '@/lib/evolution-api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await params;
  try {
    const data = await evoApi.getQr(decodeURIComponent(name));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
