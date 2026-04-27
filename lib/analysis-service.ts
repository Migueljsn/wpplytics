import type { AnalysisType } from '@prisma/client';

type TriggerAnalysisInput = {
  clientId: string;
  instanceId: string;
  type: AnalysisType;
};

export async function triggerAnalysis(input: TriggerAnalysisInput) {
  return {
    queued: true,
    ...input,
    message:
      input.type === 'QUANTITATIVE'
        ? 'Analise quantitativa enfileirada.'
        : 'Analise qualitativa enfileirada.',
  };
}
