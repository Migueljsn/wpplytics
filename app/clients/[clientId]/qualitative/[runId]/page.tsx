import { notFound } from 'next/navigation';
import { ChevronLeft, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, MessageSquare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { PrintButton } from '../../report/print-button';

type Props = { params: Promise<{ clientId: string; runId: string }> };

type WinningPattern = {
  name: string;
  effectiveness: 'alta' | 'média' | 'baixa';
  description: string;
  examples: string[];
};

type Opportunity = {
  title: string;
  examples: string[];
  recommendedSolution: string;
};

type Objection = {
  type: string;
  count: number;
  description: string;
  severity: 'alta' | 'média' | 'baixa';
};

type AntiObjectionScript = {
  objection: string;
  strategy: string;
  templateResponse: string;
  expectedOutcome: string;
};

type QualitativeJson = {
  conversationsAnalyzed?: number;
  messagesAnalyzed?: number;
  mainDiscovery?: {
    insight: string;
    urgency: 'alta' | 'média' | 'baixa';
    impactEstimate: string;
    relatedMetric: string;
  };
  winningPatterns?: WinningPattern[];
  opportunities?: Opportunity[];
  objections?: Objection[];
  antiObjectionScripts?: AntiObjectionScript[];
  tone?: string;
  summary?: string;
};

const effectivenessColor: Record<string, string> = {
  alta: '#0f9d75',
  média: '#e6a817',
  baixa: '#9ca3af',
};

const severityColor: Record<string, string> = {
  alta: '#ef4444',
  média: '#f97316',
  baixa: '#9ca3af',
};

function EffectivenessTag({ value }: { value: string }) {
  return (
    <span className="qual-tag" style={{ background: effectivenessColor[value] + '22', color: effectivenessColor[value], borderColor: effectivenessColor[value] + '55' }}>
      Efetividade: {value}
    </span>
  );
}

function SeverityBar({ severity, count, maxCount }: { severity: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="qual-obj-bar-wrap">
      <div className="qual-obj-bar" style={{ width: `${pct}%`, background: severityColor[severity] ?? '#9ca3af' }} />
      <span className="qual-obj-severity" style={{ color: severityColor[severity] ?? '#9ca3af' }}>{severity}</span>
    </div>
  );
}

function ExampleList({ examples }: { examples: string[] }) {
  if (!examples?.length) return null;
  return (
    <div className="qual-examples">
      <span className="qual-examples-label">Exemplos:</span>
      {examples.map((ex, i) => (
        <div key={i} className="qual-example-row">{ex}</div>
      ))}
    </div>
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
          <p className="kicker" style={{ color: 'var(--warn)' }}>Erro</p>
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

  const maxObjCount = Math.max(...(data.objections ?? []).map((o) => o.count), 1);
  const patternsCount = data.winningPatterns?.length ?? 0;
  const objectionsCount = data.objections?.length ?? 0;
  const opportunitiesCount = data.opportunities?.length ?? 0;

  return (
    <div className="report-shell">
      <nav className="report-nav no-print">
        <a href={`/clients/${run.client.slug ?? run.client.id}`} className="report-nav-back">
          <ChevronLeft size={16} /> Voltar ao dashboard
        </a>
        <p className="kicker" style={{ margin: 0 }}>WPPlytics</p>
        <div className="report-nav-controls">
          <ThemeToggle />
          <PrintButton />
        </div>
      </nav>

      <div className="report-doc">

        {/* ── Cabeçalho ── */}
        <header className="report-header">
          <div className="report-title-block">
            <p className="kicker">Análise Qualitativa de Atendimento via WhatsApp</p>
            <h1>{run.client.name}</h1>
            {run.instance?.label && (
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand)', margin: '4px 0 0', letterSpacing: '-0.01em' }}>
                {run.instance.label}
              </p>
            )}
            <p className="report-meta">
              {run.client.sector && <>{run.client.sector} &nbsp;·&nbsp;</>}
              {periodFrom} &nbsp;·&nbsp; Gerado em {run.completedAt?.toLocaleDateString('pt-BR') ?? '—'}
            </p>
          </div>
          <div className="qual-header-stats">
            <div className="qual-header-stat">
              <span className="qual-header-stat-value">+{data.conversationsAnalyzed ?? 0}</span>
              <span className="qual-header-stat-label">Conversas analisadas</span>
            </div>
            <div className="qual-header-stat">
              <span className="qual-header-stat-value">+{patternsCount}</span>
              <span className="qual-header-stat-label">Padrões identificados</span>
            </div>
          </div>
        </header>

        {/* ── Descoberta Principal ── */}
        {data.mainDiscovery && (
          <section className="qual-discovery">
            <div className="qual-discovery-badge">
              <Sparkles size={13} /> DESCOBERTA PRINCIPAL
            </div>
            <p className="qual-discovery-insight">{data.mainDiscovery.insight}</p>
            <div className="qual-discovery-tags">
              {data.mainDiscovery.relatedMetric && (
                <span className="qual-discovery-tag">{data.mainDiscovery.relatedMetric}</span>
              )}
              {data.mainDiscovery.urgency && (
                <span className="qual-discovery-tag qual-discovery-tag-urgency">
                  Urgência: {data.mainDiscovery.urgency}
                </span>
              )}
              {data.mainDiscovery.impactEstimate && (
                <span className="qual-discovery-tag qual-discovery-tag-impact">
                  Impacto: {data.mainDiscovery.impactEstimate}
                </span>
              )}
            </div>
          </section>
        )}

        {/* ── Panorama Geral ── */}
        <section className="report-section">
          <h2 className="report-section-title">Panorama Geral das Conversas</h2>
          <div className="qual-panorama-grid">
            <div className="qual-panorama-card">
              <MessageSquare size={20} className="qual-panorama-icon" style={{ color: 'var(--brand)' }} />
              <div>
                <div className="qual-panorama-value">{data.conversationsAnalyzed ?? 0}</div>
                <div className="qual-panorama-label">Conversas</div>
                <div className="qual-panorama-sub">na amostra representativa</div>
              </div>
            </div>
            <div className="qual-panorama-card">
              <CheckCircle2 size={20} className="qual-panorama-icon" style={{ color: '#0f9d75' }} />
              <div>
                <div className="qual-panorama-value">{patternsCount}</div>
                <div className="qual-panorama-label">Padrões</div>
                <div className="qual-panorama-sub">vencedores identificados</div>
              </div>
            </div>
            <div className="qual-panorama-card">
              <AlertTriangle size={20} className="qual-panorama-icon" style={{ color: '#f97316' }} />
              <div>
                <div className="qual-panorama-value">{objectionsCount}</div>
                <div className="qual-panorama-label">Objeções</div>
                <div className="qual-panorama-sub">tipos detectados</div>
              </div>
            </div>
            <div className="qual-panorama-card">
              <Lightbulb size={20} className="qual-panorama-icon" style={{ color: '#6366f1' }} />
              <div>
                <div className="qual-panorama-value">{opportunitiesCount}</div>
                <div className="qual-panorama-label">Oportunidades</div>
                <div className="qual-panorama-sub">de melhoria encontradas</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Resumo executivo ── */}
        {data.summary && (
          <section className="qual-summary">
            <p>{data.summary}</p>
          </section>
        )}

        {/* ── Padrões Vencedores ── */}
        {(data.winningPatterns?.length ?? 0) > 0 && (
          <section className="report-section">
            <h2 className="report-section-title">
              <CheckCircle2 size={14} style={{ color: 'var(--brand)' }} />
              Padrões Vencedores Identificados
            </h2>
            <div className="qual-cards-list">
              {data.winningPatterns!.map((p, i) => (
                <div key={i} className="qual-pattern-card">
                  <div className="qual-pattern-header">
                    <CheckCircle2 size={18} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <div className="qual-pattern-title-wrap">
                      <h3 className="qual-card-title">{p.name}</h3>
                      <EffectivenessTag value={p.effectiveness} />
                    </div>
                  </div>
                  <p className="qual-card-desc">{p.description}</p>
                  <ExampleList examples={p.examples} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Oportunidades de Melhoria ── */}
        {(data.opportunities?.length ?? 0) > 0 && (
          <section className="report-section">
            <h2 className="report-section-title">
              <Lightbulb size={14} style={{ color: '#6366f1' }} />
              Oportunidades de Melhoria
            </h2>
            <div className="qual-cards-list">
              {data.opportunities!.map((op, i) => (
                <div key={i} className="qual-opportunity-card">
                  <div className="qual-opportunity-header">
                    <AlertTriangle size={18} style={{ color: '#e6a817', flexShrink: 0 }} />
                    <h3 className="qual-card-title">{op.title}</h3>
                  </div>
                  <ExampleList examples={op.examples} />
                  {op.recommendedSolution && (
                    <div className="qual-solution-box">
                      <div className="qual-solution-label">
                        <Lightbulb size={12} /> Solução Recomendada
                      </div>
                      <p className="qual-solution-text">{op.recommendedSolution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Distribuição das Objeções ── */}
        {(data.objections?.length ?? 0) > 0 && (
          <section className="report-section">
            <h2 className="report-section-title">
              <AlertTriangle size={14} style={{ color: '#f97316' }} />
              Distribuição das Objeções
            </h2>
            <div className="qual-obj-grid">
              {data.objections!.map((obj, i) => (
                <div key={i} className="qual-obj-card">
                  <div className="qual-obj-header">
                    <span className="qual-obj-type">{obj.type}</span>
                    <span className="qual-obj-count">{obj.count} ocorrências</span>
                  </div>
                  <p className="qual-card-desc">{obj.description}</p>
                  <SeverityBar severity={obj.severity} count={obj.count} maxCount={maxObjCount} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Scripts Anti-Objeção ── */}
        {(data.antiObjectionScripts?.length ?? 0) > 0 && (
          <section className="report-section">
            <h2 className="report-section-title">
              <TrendingUp size={14} style={{ color: '#6366f1' }} />
              Scripts Anti-Objeção Recomendados
            </h2>
            <div className="qual-cards-list">
              {data.antiObjectionScripts!.map((s, i) => (
                <div key={i} className="qual-script-card">
                  <div className="qual-script-header">
                    <span className="qual-script-objection">{s.objection}</span>
                    {s.strategy && (
                      <span className="qual-script-strategy">{s.strategy}</span>
                    )}
                  </div>
                  {s.templateResponse && (
                    <div className="qual-script-template">
                      <span className="qual-solution-label">Template de Resposta:</span>
                      <blockquote className="qual-script-quote">{s.templateResponse}</blockquote>
                    </div>
                  )}
                  {s.expectedOutcome && (
                    <div className="qual-script-outcome">
                      <span className="qual-script-outcome-dot" />
                      <span><strong>Resultado esperado:</strong> {s.expectedOutcome}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Tom Geral ── */}
        {data.tone && (
          <section className="report-section">
            <h2 className="report-section-title">Tom Geral do Atendimento</h2>
            <p className="qual-tone">{data.tone}</p>
          </section>
        )}

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
