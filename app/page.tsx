import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <p className="kicker">WPPlytics</p>
        <h1>Monitoramento de atendimento via WhatsApp com histórico, chat interno e análise acionável.</h1>
        <p className="lead">
          O produto foi reposicionado para o fluxo certo: conectar instâncias via Evolution API,
          acumular histórico real de mensagens, navegar nas conversas internamente e liberar
          relatórios quantitativos e qualitativos após no mínimo 5 dias de histórico.
        </p>
        <div className="landing-actions">
          <Link href="/clients/fonil" className="primary-link">
            Abrir dashboard
          </Link>
          <a href="/api/health" className="ghost-link">
            Healthcheck
          </a>
        </div>
      </section>
    </main>
  );
}
