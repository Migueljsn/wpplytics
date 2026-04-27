import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisType } from '@prisma/client';
import { triggerAnalysis } from '@/lib/analysis-service';

type RouteParams = {
  params: Promise<{
    clientId: string;
    instanceId: string;
    reportType: string;
  }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { clientId, instanceId, reportType } = await params;
  const type = reportType.toUpperCase() as AnalysisType;

  if (type !== 'QUANTITATIVE' && type !== 'QUALITATIVE') {
    return NextResponse.json({ error: 'Tipo de relatorio invalido.' }, { status: 400 });
  }

  const result = await triggerAnalysis({
    clientId,
    instanceId,
    type,
  });

  return NextResponse.json(result);
}
