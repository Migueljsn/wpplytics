import { notFound } from 'next/navigation';
import {
  MessageSquare, Hash, TrendingUp, Clock, AlertCircle, BarChart2,
  ChevronLeft, Zap, Target, Activity, CalendarDays, Info,
} from 'lucide-react';
import { getDashboardClient, getQuantitativeReport } from '@/lib/dashboard';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { PrintButton } from './print-button';

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ period?: string }>;
};

function parsePeriod(period?: string): { from: Date | null; to: Date; label: string; days: number | null } {
  const to = new Date();
  if (period === '7d') {
    const from = new Date(to); from.setDate(from.getDate() - 7);
    return { from, to, label: 'Últimos 7 dias', days: 7 };
  }
  if (period === '90d') {
    const from = new Date(to); from.setDate(from.getDate() - 90);
    return { from, to, label: 'Últimos 90 dias', days: 90 };
  }
  if (period === 'all') return { from: null, to, label: 'Todo o período', days: null };
  const from = new Date(to); from.setDate(from.getDate() - 30);
  return { from, to, label: 'Últimos 30 dias', days: 30 };
}

function fmt(n: number | null, suffix = 'min') {
  if (n === null) return '—';
  return `${n} ${suffix}`;
}

function statusColor(avgMin: number | null, benchmarkMin: number): string {
  if (avgMin === null) return '';
  return avgMin <= benchmarkMin ? 'ok' : 'warn';
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { clientId } = await params;
  const { period } = await searchParams;

  const client = await getDashboardClient(clientId);
  if (!client) notFound();

  const instance = client.instances[0];
  if (!instance) notFound();

  const { from, to, label, days } = parsePeriod(period);
  const report = await getQuantitativeReport(instance.id, from, to);

  const maxHour = Math.max(...report.byHour.map((h) => h.count), 1);
  const maxBucket = Math.max(...report.responseTimeBuckets.map(b => b.count), 1);

  const generatedAt = new Date().toLocaleString('pt-BR');
  const fromStr = from ? from.toLocaleDateString('pt-BR') : null;
  const toStr = to.toLocaleDateString('pt-BR');

  const tmpStatus = statusColor(report.averageFirstResponseMinutes, report.benchmarks.tmpIdealMinutes);
  const rateStatus = report.responseRate >= report.benchmarks.minResponseRate ? 'ok' : 'warn';

  return (
    <div className="report-shell">

      {/* Nav */}
      <nav className="report-nav no-print">
        <a href={`/clients/${client.slug}`} className="report-nav-back">
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
            <p className="kicker">Análise Quantitativa de Atendimento via WhatsApp</p>
            <h1>{client.name}</h1>
            <p className="report-meta">
              {client.sector && <>{client.sector} &nbsp;·&nbsp;</>}
              {fromStr ? <>{fromStr} a {toStr}</> : <>Todo o período</>}
              {days && <> &nbsp;·&nbsp; {days} dias</>}
            </p>
            <p className="report-meta">Gerado em: {generatedAt} &nbsp;·&nbsp; {instance.label}</p>
          </div>
        </header>

        {/* ── KPIs resumo ── */}
        <section className="report-kpis">
          <div className="kpi-card" style={{ animationDelay: '0ms' }}>
            <MessageSquare size={18} className="kpi-icon" />
            <span className="kpi-value">{report.totalConversations}</span>
            <span className="kpi-label">Conversas</span>
          </div>
          <div className="kpi-card" style={{ animationDelay: '60ms' }}>
            <Hash size={18} className="kpi-icon" />
            <span className="kpi-value">{report.totalMessages}</span>
            <span className="kpi-label">Total de msgs</span>
          </div>
          <div className="kpi-card" style={{ animationDelay: '120ms' }}>
            <BarChart2 size={18} className="kpi-icon" />
            <span className="kpi-value">{report.averageMessagesPerConversation}</span>
            <span className="kpi-label">Média/conversa</span>
          </div>
          <div className="kpi-card" style={{ animationDelay: '180ms' }}>
            <Activity size={18} className="kpi-icon" />
            <span className="kpi-value">{report.dailyAverage}</span>
            <span className="kpi-label">Média diária</span>
          </div>
        </section>

        {/* ── Visão Geral do Período ── */}
        <section className="report-section">
          <h2 className="report-section-title"><BarChart2 size={14} /> Visão Geral do Período</h2>
          <div className="report-overview">
            <div className="overview-bar-row">
              <span className="overview-bar-label">Mensagens Recebidas</span>
              <div className="overview-bar-track">
                <div className="overview-bar-fill" style={{ width: `${report.inboundPercent}%`, background: 'var(--brand)' }} />
              </div>
              <span className="overview-bar-value">{report.inboundMessages} ({report.inboundPercent}%)</span>
            </div>
            <div className="overview-bar-row">
              <span className="overview-bar-label">Mensagens Enviadas</span>
              <div className="overview-bar-track">
                <div className="overview-bar-fill" style={{ width: `${report.outboundPercent}%`, background: 'var(--blue)' }} />
              </div>
              <span className="overview-bar-value">{report.outboundMessages} ({report.outboundPercent}%)</span>
            </div>
            <div className="overview-proactivity">
              <span>Ratio de Proatividade</span>
              <span className={`overview-ratio ${report.proactivityRatio < 1 ? 'overview-ratio-warn' : 'overview-ratio-ok'}`}>
                {report.proactivityRatio}x
                {report.proactivityRatio < 1 && <AlertCircle size={13} />}
              </span>
            </div>
            {report.proactivityRatio > 0 && report.proactivityRatio < 1 && (
              <div className="report-alert report-alert-warn">
                <AlertCircle size={14} /> <strong>Atenção!</strong> Equipe muito reativa. Considere aumentar a proatividade.
              </div>
            )}
          </div>
        </section>

        {/* ── Tempo de Resposta ── */}
        <section className="report-section">
          <h2 className="report-section-title"><Clock size={14} /> Tempo de Resposta</h2>
          <div className="report-tmp-cards">
            <div className={`tmp-card tmp-card-${tmpStatus || 'neutral'}`}>
              <span className="tmp-card-label">TMP Médio</span>
              <span className="tmp-card-sub">Tempo Médio da Primeira Resposta</span>
              <span className="tmp-card-value">{fmt(report.averageFirstResponseMinutes)}</span>
              <span className="tmp-card-bench">Benchmark: &lt; {report.benchmarks.tmpIdealMinutes} min</span>
            </div>
            <div className="tmp-card tmp-card-neutral">
              <span className="tmp-card-label">TMP Mediano</span>
              <span className="tmp-card-sub">Mais resistente a outliers</span>
              <span className="tmp-card-value">{fmt(report.medianFirstResponseMinutes)}</span>
              <span className="tmp-card-bench">Valor central (50° percentil)</span>
            </div>
          </div>
          {report.averageFirstResponseMinutes !== null &&
           report.averageFirstResponseMinutes > report.benchmarks.tmpIdealMinutes && (
            <div className="report-alert report-alert-warn">
              <AlertCircle size={14} /> <strong>Atenção!</strong> TMP médio acima do benchmark de {report.benchmarks.tmpIdealMinutes} min.
            </div>
          )}
        </section>

        {/* ── Distribuição por Velocidade ── */}
        {report.responseTimeBuckets.some(b => b.count > 0) && (
          <section className="report-section">
            <h2 className="report-section-title"><Zap size={14} /> Distribuição por Velocidade ({report.totalConversations} conversas)</h2>
            <div className="speed-buckets">
              {report.responseTimeBuckets.map((bucket) => (
                <div key={bucket.label} className="speed-bucket-row">
                  <span className="speed-bucket-dot" style={{ background: bucket.color }} />
                  <span className="speed-bucket-label">{bucket.label}</span>
                  <div className="speed-bucket-track">
                    <div
                      className="speed-bucket-fill"
                      style={{
                        width: `${Math.round((bucket.count / maxBucket) * 100)}%`,
                        background: bucket.color,
                      }}
                    />
                  </div>
                  <span className="speed-bucket-value">{bucket.count} ({bucket.percentage}%)</span>
                </div>
              ))}
              <p className="report-note">
                <Info size={11} /> Percentuais calculados sobre o total de {report.totalConversations} conversas.
                TMP fora do padrão: resposta automática (&lt; 6s) ou outlier extremo (&gt; 24h).
              </p>
            </div>
          </section>
        )}

        {/* ── Performance de Atendimento ── */}
        <section className="report-section">
          <h2 className="report-section-title"><Target size={14} /> Performance de Atendimento</h2>
          <div className="perf-cards">
            <div className="perf-card perf-card-red">
              <span className="perf-card-title">Conversas Sem Resposta</span>
              <span className="perf-card-value">{report.noResponseCount}</span>
            </div>
            <div className={`perf-card perf-card-${report.noResponseCount / Math.max(report.totalConversations, 1) * 100 > 5 ? 'warn' : 'green'}`}>
              <span className="perf-card-title">% Sem Resposta</span>
              <span className="perf-card-value">{(100 - report.responseRate).toFixed(1)}%</span>
              <span className="perf-card-bench">Benchmark: &lt; 5%</span>
            </div>
            <div className={`perf-card perf-card-${rateStatus === 'ok' ? 'green' : 'warn'}`}>
              <span className="perf-card-title">Taxa de Resposta</span>
              <span className="perf-card-value">{report.responseRate}%</span>
              <span className="perf-card-bench">Benchmark: &gt; {report.benchmarks.minResponseRate}%</span>
            </div>
          </div>
          {report.noResponseCount > 0 && (
            <div className="report-alert report-alert-warn">
              <AlertCircle size={14} /> <strong>Atenção:</strong> {report.noResponseCount} {report.noResponseCount === 1 ? 'conversa não foi respondida' : 'conversas não foram respondidas'} ({(100 - report.responseRate).toFixed(1)}%).
            </div>
          )}
        </section>

        {/* ── Distribuição por hora (gráfico visual) ── */}
        <section className="report-section">
          <h2 className="report-section-title"><BarChart2 size={14} /> Mensagens recebidas por hora do dia</h2>
          <div className="report-bars">
            {report.byHour.map(({ hour, count }, i) => (
              <div key={hour} className="report-bar-col">
                <span className="report-bar-count">{count > 0 ? count : ''}</span>
                <div
                  className="report-bar-fill"
                  style={{ height: `${Math.round((count / maxHour) * 100)}%`, animationDelay: `${i * 18}ms` }}
                />
                <span className="report-bar-label">{String(hour).padStart(2, '0')}h</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── TMP por período ── */}
        {report.tmpByHour.length > 0 && (
          <section className="report-section">
            <h2 className="report-section-title"><Clock size={14} /> Performance por Período</h2>
            <p className="report-section-sub">Apenas conversas com TMP válido ({report.tmpByHour.reduce((a, r) => a + r.count, 0)} de {report.totalConversations} conversas)</p>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>TMP Médio</th>
                  <th>Contatos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.tmpByHour.map((row) => (
                  <tr key={row.hourRange} className={row.avgMinutes > report.benchmarks.tmpIdealMinutes ? 'table-row-warn' : 'table-row-ok'}>
                    <td className="td-hour">{row.hourRange}</td>
                    <td className="td-tmp"><strong>{row.avgMinutes} min</strong></td>
                    <td className="td-count">{row.count}</td>
                    <td className="td-status">
                      {row.avgMinutes <= report.benchmarks.tmpIdealMinutes
                        ? <span className="status-dot-ok" />
                        : <span className="status-dot-warn" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="report-note">
              <Info size={11} /> Apenas conversas onde foi possível calcular o TMP (cliente enviou mensagem e empresa respondeu dentro de 24h).
            </p>
          </section>
        )}

        {/* ── Distribuição de Volume ── */}
        {report.volumeByDate.length > 0 && (
          <section className="report-section">
            <h2 className="report-section-title"><CalendarDays size={14} /> Distribuição de Volume</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Dia da Semana</th>
                  <th style={{ textAlign: 'right' }}>Conversas</th>
                </tr>
              </thead>
              <tbody>
                {report.volumeByDate.map((row) => (
                  <tr key={row.date} className={row.isPeak ? 'table-row-peak' : ''}>
                    <td className="td-date">
                      {row.date}
                      {row.isPeak && <span className="peak-badge">PICO</span>}
                    </td>
                    <td>{row.dayOfWeek}</td>
                    <td style={{ textAlign: 'right' }}><strong>{row.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="volume-summary">
              <div className="volume-summary-item">
                <BarChart2 size={14} />
                <span>Média Diária</span>
                <strong>{report.dailyAverage}</strong>
              </div>
              <div className="volume-summary-item">
                <TrendingUp size={14} />
                <span>Pico de Volume</span>
                <strong>{Math.max(...report.volumeByDate.map(v => v.count))}</strong>
              </div>
            </div>
          </section>
        )}

        {/* ── Benchmarks do Segmento ── */}
        <section className="report-section">
          <h2 className="report-section-title"><Target size={14} /> Benchmarks do Segmento</h2>
          <div className="benchmark-cards">
            <div className="benchmark-card">
              <Clock size={20} className="benchmark-icon" />
              <span className="benchmark-label">TMP Ideal</span>
              <span className="benchmark-value">&lt; {report.benchmarks.tmpIdealMinutes} min</span>
            </div>
            <div className="benchmark-card">
              <TrendingUp size={20} className="benchmark-icon" />
              <span className="benchmark-label">Taxa Resposta Mínima</span>
              <span className="benchmark-value">&gt; {report.benchmarks.minResponseRate}%</span>
            </div>
            <div className="benchmark-card">
              <Target size={20} className="benchmark-icon" />
              <span className="benchmark-label">Taxa Conversão Típica</span>
              <span className="benchmark-value">30%</span>
            </div>
          </div>
        </section>

        <footer className="report-footer">
          <p>WPPlytics &nbsp;·&nbsp; {client.name} &nbsp;·&nbsp; {instance.label} &nbsp;·&nbsp; {label}</p>
        </footer>
      </div>
    </div>
  );
}
