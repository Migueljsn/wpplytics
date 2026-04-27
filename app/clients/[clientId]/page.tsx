import { notFound } from 'next/navigation';
import { getDashboardClient, getInstanceConversations, getReportPreviews } from '@/lib/dashboard';
import { ConversationViewer } from './conversation-viewer';

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;
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
    getInstanceConversations(selectedInstance.id),
    getReportPreviews(selectedInstance.id),
  ]);

  const canAnalyze = selectedInstance.reportAvailability.minimumDaysMet;

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="kicker">WPPlytics</p>
          <h1>{client.name}</h1>
          <p>{client.sector}</p>
        </div>

        <section className="sidebar-card">
          <h2>Instância conectada</h2>
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
          <h2>Relatórios</h2>
          <p className="muted">
            Liberado com no mínimo 5 dias de histórico coletado a partir da primeira mensagem.
          </p>
          <div className="action-stack">
            <button disabled={!canAnalyze} className="action-button">
              Gerar Quantitativo
            </button>
            <button disabled={!canAnalyze} className="action-button secondary">
              Gerar Qualitativo
            </button>
          </div>
          <p className={canAnalyze ? 'status-positive' : 'status-warning'}>
            {canAnalyze
              ? 'Histórico mínimo atingido.'
              : `Bloqueado até ${formatDate(selectedInstance.reportAvailability.earliestAnalyzableAt)}.`}
          </p>
        </section>

        <section className="sidebar-card">
          <h2>Prévia</h2>
          <div className="preview-block">
            <h3>Quantitativo</h3>
            <ul>
              <li>{previews.quantitative.totalConversations} conversas</li>
              <li>{previews.quantitative.totalMessages} mensagens</li>
              <li>{previews.quantitative.responseRate}% taxa de resposta</li>
              <li>
                {previews.quantitative.averageFirstResponseMinutes > 0
                  ? `${previews.quantitative.averageFirstResponseMinutes} min TMP médio`
                  : 'TMP ainda calculando'}
              </li>
            </ul>
          </div>
          <div className="preview-block">
            <h3>Qualitativo</h3>
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
            <h2>Conversas e chat</h2>
          </div>
          <div className="header-note">
            Somente leitura — sem envio de mensagens.
          </div>
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
