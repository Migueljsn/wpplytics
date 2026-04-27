import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '../../report/print-button';

type Props = {
  params: Promise<{ clientId: string; runId: string }>;
};

type QualitativeJson = {
  summary?: string;
  tone?: string;
  objections?: string[];
  opportunities?: string[];
  patterns?: string[];
  recommendations?: string[];
  conversationsAnalyzed?: number;
  messagesAnalyzed?: number;
};

function Section({ title, items, accent }: { title: string; items: string[]; accent?: string }) {
  if (!items?.length) return null;
  return (
    <section className="report-section">
      <h2 className="report-section-title">{title}</h2>
      <ul className="qual-list" style={accent ? { '--accent': accent } as React.CSSProperties : undefined}>
        {items.map((item, i) => (
          <li key={i} className="qual-item">{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function QualitativeReportPage({ params }: Props) {
  const { runId } = await params;

  const run = await prisma.analysisRun.findUnique({
    where: { id: runId },
    include: { client: true, instance: true },
  });

  if (!run) notFound();

  if (run.status === 'PROCESSING') {
    return (
      <div className="report-shell">
        <div className="report-doc" style={{ alignItems: 'center', padding: '80px 48px' }}>
          <p className="kicker">Aguarde</p>
          <h1 style={{ fontSize: '1.6rem', margin: '8px 0' }}>Gerando análise qualitativa…</h1>
          <p className="muted">Isso pode levar alguns segundos. Recarregue a página em instantes.</p>
        </div>
      </div>
    );
  }

  if (run.status === 'FAILED') {
    return (
      <div className="report-shell">
        <div className="report-doc" style={{ alignItems: 'center', padding: '80px 48px' }}>
          <p className="kicker" style={{ color: '#b5760b' }}>Erro</p>
          <h1 style={{ fontSize: '1.6rem', margin: '8px 0' }}>Falha na geração</h1>
          <p className="muted">{run.errorMessage ?? 'Erro desconhecido.'}</p>
        </div>
      </div>
    );
  }

  const data = (run.reportJson ?? {}) as QualitativeJson;
  const periodFrom = run.startDate.getTime() === 0
    ? 'Todo o período'
    : `${run.startDate.toLocaleDateString('pt-BR')} – ${run.endDate.toLocaleDateString('pt-BR')}`;

  return (
    <div className="report-shell">
      <div className="report-doc">

        <header className="report-header">
          <div className="report-title-block">
            <p className="kicker">WPPlytics · Relatório Qualitativo</p>
            <h1>{run.client.name}</h1>
            <p className="report-meta">
              {periodFrom} &nbsp;·&nbsp; {data.conversationsAnalyzed ?? '—'} conversas analisadas
              &nbsp;·&nbsp; {run.instance?.label}
            </p>
          </div>
          <PrintButton />
        </header>

        {data.summary && (
          <section className="qual-summary">
            <p>{data.summary}</p>
          </section>
        )}

        {data.tone && (
          <section className="report-section">
            <h2 className="report-section-title">Tom geral</h2>
            <p className="qual-tone">{data.tone}</p>
          </section>
        )}

        <div className="qual-grid">
          <Section title="Objeções identificadas" items={data.objections ?? []} accent="#b5760b" />
          <Section title="Oportunidades" items={data.opportunities ?? []} accent="#0f9d75" />
        </div>

        <Section title="Padrões recorrentes" items={data.patterns ?? []} />
        <Section title="Recomendações práticas" items={data.recommendations ?? []} accent="#4c8cf3" />

        <footer className="report-footer">
          <p>
            WPPlytics &nbsp;·&nbsp; {run.client.name} &nbsp;·&nbsp; {run.instance?.label}
            &nbsp;·&nbsp; Gerado em {run.completedAt?.toLocaleString('pt-BR') ?? '—'}
          </p>
        </footer>
      </div>
    </div>
  );
}
