import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Wifi, BarChart2, Sparkles, Building2, LogOut, ShieldCheck, MessageSquare, Hash, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { getDashboardClient, getInstanceConversations, getReportPreviews } from '@/lib/dashboard';
import { ConversationViewer } from './conversation-viewer';
import { DateFilter } from './date-filter';
import { GenerateQualitativeButton } from './generate-qualitative-button';
import { signOut } from '@/auth';

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ period?: string }>;
};

function parsePeriod(period?: string): { from: Date | null; to: Date } {
  const to = new Date();
  if (period === '7d') {
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return { from, to };
  }
  if (period === '90d') {
    const from = new Date(to);
    from.setDate(from.getDate() - 90);
    return { from, to };
  }
  if (period === 'all') return { from: null, to };
  // Default: 30d
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from, to };
}

export default async function ClientPage({ params, searchParams }: ClientPageProps) {
  const { clientId } = await params;
  const { period } = await searchParams;
  const { from, to } = parsePeriod(period);

  const client = await getDashboardClient(clientId);
  if (!client) notFound();

  const selectedInstance = client.instances[0];

  if (!selectedInstance) {
    return (
      <main className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <p className="kicker">WPPlytics</p>
            <h1>{client.name}</h1>
          </div>
          <section className="sidebar-card">
            <h2>Sem instâncias</h2>
            <p className="muted">Nenhuma instância WhatsApp configurada.</p>
          </section>
        </aside>
      </main>
    );
  }

  const [conversations, previews] = await Promise.all([
    getInstanceConversations(selectedInstance.id, from, to),
    getReportPreviews(selectedInstance.id, from, to),
  ]);

  const canQuantitative = selectedInstance.conversationCount > 0;
  const canQualitative = selectedInstance.reportAvailability.minimumDaysMet;
  const activePeriod = period ?? '30d';
  const reportHref = `/clients/${client.slug}/report?period=${activePeriod}`;

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="kicker" style={{ margin: 0 }}>WPPlytics</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ThemeToggle />
              <a href="/admin" className="admin-nav-link" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} /> Admin
              </a>
              <form action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}>
                <button type="submit" className="admin-nav-link" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LogOut size={13} /> Sair
                </button>
              </form>
            </div>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={20} style={{ opacity: 0.6, flexShrink: 0 }} />
            {client.name}
          </h1>
          {client.sector && <p>{client.sector}</p>}
        </div>

        <section className="sidebar-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wifi size={15} /> Instância conectada</h2>
          <div className="instance-badge">{selectedInstance.label}</div>
          <dl className="metric-list">
            <div>
              <dt>Status</dt>
              <dd>{selectedInstance.status}</dd>
            </div>
            <div>
              <dt>Conectada em</dt>
              <dd>{formatDateTime(selectedInstance.connectedAt)}</dd>
            </div>
            <div>
              <dt>Primeira mensagem</dt>
              <dd>{formatDateTime(selectedInstance.firstMessageAt)}</dd>
            </div>
            <div>
              <dt>Dias acumulados</dt>
              <dd>{selectedInstance.reportAvailability.collectedDays} dias</dd>
            </div>
            <div>
              <dt>Conversas</dt>
              <dd>{selectedInstance.conversationCount}</dd>
            </div>
            <div>
              <dt>Mensagens</dt>
              <dd>{selectedInstance.messageCount}</dd>
            </div>
          </dl>
        </section>

        <section className="sidebar-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={15} /> Relatórios</h2>
          <p className="muted">
            Liberado com no mínimo 5 dias de histórico coletado a partir da primeira mensagem.
          </p>
          <div className="action-stack">
            {canQuantitative ? (
              <a href={reportHref} className="action-button" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={15} /> Gerar Quantitativo
              </a>
            ) : (
              <button disabled className="action-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={15} /> Gerar Quantitativo
              </button>
            )}
            <GenerateQualitativeButton
              clientId={client.id}
              clientSlug={client.slug}
              instanceId={selectedInstance.id}
              from={from?.toISOString() ?? null}
              to={to.toISOString()}
              disabled={!canQualitative}
            />
          </div>
          <p className={canQualitative ? 'status-positive' : 'status-warning'}>
            {canQualitative
              ? 'Histórico mínimo atingido.'
              : `Qualitativo disponível após ${formatDate(selectedInstance.reportAvailability.earliestAnalyzableAt)}.`}
          </p>
        </section>

        <section className="sidebar-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={15} /> Prévia do período</h2>
          <div className="preview-block">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 5 }}><BarChart2 size={13} /> Quantitativo</h3>
            <ul>
              <li><MessageSquare size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, opacity: 0.5 }} />{previews.quantitative.totalConversations} conversas</li>
              <li><Hash size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, opacity: 0.5 }} />{previews.quantitative.totalMessages} mensagens</li>
              <li><TrendingUp size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, opacity: 0.5 }} />{previews.quantitative.responseRate}% taxa de resposta</li>
              <li>
                <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, opacity: 0.5 }} />
                {previews.quantitative.averageFirstResponseMinutes > 0
                  ? `${previews.quantitative.averageFirstResponseMinutes} min TMP médio`
                  : 'TMP ainda calculando'}
              </li>
            </ul>
          </div>
          <div className="preview-block">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Sparkles size={13} /> Qualitativo</h3>
            <p className="muted" style={{ margin: 0 }}>
              Disponível após geração do relatório.
            </p>
          </div>
        </section>
      </aside>

      <section className="content-panel">
        <header className="content-header">
          <div>
            <p className="kicker">Histórico interno</p>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={18} style={{ opacity: 0.6 }} /> Conversas e chat</h2>
          </div>
          <Suspense fallback={<div className="date-filter-skeleton" />}>
            <DateFilter current={activePeriod} />
          </Suspense>
        </header>

        <ConversationViewer conversations={conversations} />
      </section>
    </main>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return 'n/d';
  return new Date(value).toLocaleString('pt-BR');
}

function formatDate(value: string | null) {
  if (!value) return 'n/d';
  return new Date(value).toLocaleDateString('pt-BR');
}
