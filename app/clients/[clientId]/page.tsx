import { getDashboardClient, getInstanceConversations, getReportPreviews } from '@/lib/dashboard';

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;
  const client = await getDashboardClient(clientId);
  const conversations = await getInstanceConversations();
  const previews = await getReportPreviews();
  const selectedInstance = client.instances[0];
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
              <dt>Histórico acumulado</dt>
              <dd>{selectedInstance.reportAvailability.collectedDays} dias</dd>
            </div>
          </dl>
        </section>

        <section className="sidebar-card">
          <h2>Relatórios</h2>
          <p className="muted">
            A análise é liberada quando a instância possui no mínimo 5 dias de histórico
            coletado a partir da primeira mensagem salva.
          </p>
          <div className="action-stack">
            <button disabled={!canAnalyze} className="action-button">
              Gerar relatório Quantitativo
            </button>
            <button disabled={!canAnalyze} className="action-button secondary">
              Gerar relatório Qualitativo
            </button>
          </div>
          <p className={canAnalyze ? 'status-positive' : 'status-warning'}>
            {canAnalyze
              ? 'Histórico mínimo atendido. Os botões podem acionar a geração de análise.'
              : `Análise bloqueada até ${formatDate(selectedInstance.reportAvailability.earliestAnalyzableAt)}.`}
          </p>
        </section>

        <section className="sidebar-card">
          <h2>Prévia dos relatórios</h2>
          <div className="preview-block">
            <h3>Quantitativo</h3>
            <ul>
              <li>{previews.quantitative.totalConversations} conversas</li>
              <li>{previews.quantitative.totalMessages} mensagens</li>
              <li>{previews.quantitative.responseRate}% taxa de resposta</li>
              <li>{previews.quantitative.averageFirstResponseMinutes} min TMP</li>
            </ul>
          </div>
          <div className="preview-block">
            <h3>Qualitativo</h3>
            <ul>
              {previews.qualitative.patterns.map((pattern) => (
                <li key={pattern}>{pattern}</li>
              ))}
            </ul>
          </div>
        </section>
      </aside>

      <section className="content-panel">
        <header className="content-header">
          <div>
            <p className="kicker">Histórico interno</p>
            <h2>Lista de conversas e visualização em chat</h2>
          </div>
          <div className="header-note">
            Sem envio de mensagens. Esta UI é apenas para inspeção, leitura e acionamento das análises.
          </div>
        </header>

        <div className="conversation-layout">
          <section className="conversation-list">
            {conversations.map((conversation, index) => (
              <article
                key={conversation.id}
                className={`conversation-row ${index === 0 ? 'conversation-row-active' : ''}`}
              >
                <div className="conversation-row-head">
                  <strong>{conversation.contactName}</strong>
                  <span>{formatHour(conversation.endedAt)}</span>
                </div>
                <p>{lastMessage(conversation.messages)}</p>
                <div className="conversation-row-meta">
                  <span>{conversation.messageCount} msgs</span>
                  <span>
                    TMP:{' '}
                    {conversation.firstResponseTimeSecs
                      ? `${Math.round(conversation.firstResponseTimeSecs / 60)} min`
                      : 'n/d'}
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className="chat-panel">
            <header className="chat-panel-header">
              <div>
                <h3>{conversations[0].contactName}</h3>
                <p>{conversations[0].remoteJid}</p>
              </div>
              <div className="chat-chip">Somente leitura</div>
            </header>

            <div className="message-thread">
              {conversations[0].messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble ${message.fromMe ? 'message-bubble-out' : 'message-bubble-in'}`}
                >
                  <p>{message.textContent}</p>
                  <span>{formatHour(message.sentAt)}</span>
                </div>
              ))}
            </div>

            <footer className="chat-panel-footer">
              <div className="disabled-input">
                Campo de envio desabilitado. O produto não envia mensagens, apenas observa e analisa.
              </div>
            </footer>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'n/d';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatDate(value: string | null) {
  if (!value) {
    return 'n/d';
  }

  return new Date(value).toLocaleDateString('pt-BR');
}

function formatHour(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function lastMessage(messages: Array<{ textContent: string }>) {
  return messages[messages.length - 1]?.textContent ?? '';
}
