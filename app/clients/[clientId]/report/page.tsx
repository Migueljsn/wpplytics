import { notFound } from 'next/navigation';
import { MessageSquare, Hash, TrendingUp, Clock, AlertCircle, BarChart2, Printer, ChevronLeft } from 'lucide-react';
import { getDashboardClient, getQuantitativeReport } from '@/lib/dashboard';
import { PrintButton } from './print-button';

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ period?: string }>;
};

function parsePeriod(period?: string): { from: Date | null; to: Date; label: string } {
  const to = new Date();
  if (period === '7d') {
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return { from, to, label: 'Últimos 7 dias' };
  }
  if (period === '90d') {
    const from = new Date(to);
    from.setDate(from.getDate() - 90);
    return { from, to, label: 'Últimos 90 dias' };
  }
  if (period === 'all') return { from: null, to, label: 'Todo o período' };
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from, to, label: 'Últimos 30 dias' };
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { clientId } = await params;
  const { period } = await searchParams;

  const client = await getDashboardClient(clientId);
  if (!client) notFound();

  const instance = client.instances[0];
  if (!instance) notFound();

  const { from, to, label } = parsePeriod(period);
  const report = await getQuantitativeReport(instance.id, from, to);

  const maxHour = Math.max(...report.byHour.map((h) => h.count), 1);
  const maxDay = Math.max(...report.byDayOfWeek.map((d) => d.count), 1);

  const generatedAt = new Date().toLocaleString('pt-BR');

  return (
    <div className="report-shell">
      <div className="report-doc">

        <header className="report-header">
          <div className="report-title-block">
            <p className="kicker">WPPlytics · Relatório Quantitativo</p>
            <h1>{client.name}</h1>
            <p className="report-meta">
              {label} &nbsp;·&nbsp; Gerado em {generatedAt} &nbsp;·&nbsp; {instance.label}
            </p>
          </div>
          <PrintButton />
        </header>

        <section className="report-kpis">
          <div className="kpi-card" style={{ animationDelay: '0ms' }}>
            <MessageSquare size={18} className="kpi-icon" />
            <span className="kpi-value">{report.totalConversations}</span>
            <span className="kpi-label">Conversas</span>
          </div>
          <div className="kpi-card" style={{ animationDelay: '60ms' }}>
            <Hash size={18} className="kpi-icon" />
            <span className="kpi-value">{report.totalMessages}</span>
            <span className="kpi-label">Msgs recebidas</span>
          </div>
          <div className="kpi-card kpi-card-brand" style={{ animationDelay: '120ms' }}>
            <TrendingUp size={18} className="kpi-icon" />
            <span className="kpi-value">{report.responseRate}%</span>
            <span className="kpi-label">Taxa de resposta</span>
          </div>
          <div className="kpi-card" style={{ animationDelay: '180ms' }}>
            <Clock size={18} className="kpi-icon" />
            <span className="kpi-value">
              {report.averageFirstResponseMinutes != null
                ? `${report.averageFirstResponseMinutes}min`
                : '—'}
            </span>
            <span className="kpi-label">TMP médio</span>
          </div>
          <div className="kpi-card kpi-card-warn" style={{ animationDelay: '240ms' }}>
            <AlertCircle size={18} className="kpi-icon" />
            <span className="kpi-value">{report.noResponseCount}</span>
            <span className="kpi-label">Sem resposta</span>
          </div>
          <div className="kpi-card" style={{ animationDelay: '300ms' }}>
            <BarChart2 size={18} className="kpi-icon" />
            <span className="kpi-value">{report.averageMessagesPerConversation}</span>
            <span className="kpi-label">Msgs/conversa</span>
          </div>
        </section>

        <section className="report-section">
          <h2 className="report-section-title">Mensagens recebidas por hora do dia</h2>
          <div className="report-bars">
            {report.byHour.map(({ hour, count }, i) => (
              <div key={hour} className="report-bar-col">
                <span className="report-bar-count">{count > 0 ? count : ''}</span>
                <div
                  className="report-bar-fill"
                  style={{
                    height: `${Math.round((count / maxHour) * 100)}%`,
                    animationDelay: `${i * 20}ms`,
                  }}
                />
                <span className="report-bar-label">{String(hour).padStart(2, '0')}h</span>
              </div>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2 className="report-section-title">Mensagens recebidas por dia da semana</h2>
          <div className="report-day-bars">
            {report.byDayOfWeek.map(({ day, label: dayLabel, count }, i) => (
              <div key={day} className="report-day-row">
                <span className="report-day-name">{dayLabel}</span>
                <div className="report-day-track">
                  <div
                    className="report-day-fill"
                    style={{
                      width: `${Math.round((count / maxDay) * 100)}%`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                <span className="report-day-count">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="report-footer">
          <p>WPPlytics &nbsp;·&nbsp; {client.name} &nbsp;·&nbsp; {instance.label} &nbsp;·&nbsp; {label}</p>
        </footer>
      </div>
    </div>
  );
}
