import { signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createClient, createInstance } from './actions';

type SearchParams = Promise<{ error?: string; ok?: string }>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, ok } = await searchParams;

  const clients = await prisma.client.findMany({
    include: { instances: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="kicker">WPPlytics</p>
          <h1 className="admin-title">Painel de Administração</h1>
        </div>
        <form action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}>
          <button type="submit" className="action-button secondary admin-signout">
            Sair
          </button>
        </form>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error">{decodeURIComponent(error)}</div>
      )}
      {ok === 'cliente' && (
        <div className="admin-alert admin-alert-ok">Cliente criado com sucesso.</div>
      )}
      {ok === 'instancia' && (
        <div className="admin-alert admin-alert-ok">Instância criada com sucesso.</div>
      )}

      <div className="admin-grid">
        {/* ── Clients list ── */}
        <section className="admin-card">
          <h2 className="admin-card-title">
            Clientes
            <span className="cv-badge" style={{ marginLeft: 8 }}>{clients.length}</span>
          </h2>

          {clients.length === 0 ? (
            <p className="muted">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <ul className="admin-client-list">
              {clients.map((client) => (
                <li key={client.id} className="admin-client-row">
                  <div className="admin-client-info">
                    <strong>{client.name}</strong>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>/{client.slug}</span>
                    {client.sector && (
                      <span className="instance-badge" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        {client.sector}
                      </span>
                    )}
                  </div>
                  <div className="admin-instance-list">
                    {client.instances.length === 0 ? (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Sem instâncias</span>
                    ) : (
                      client.instances.map((inst) => (
                        <div key={inst.id} className="admin-instance-row">
                          <span className="admin-instance-dot" data-status={inst.status} />
                          <span style={{ fontSize: '0.82rem' }}>{inst.label}</span>
                          <code style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{inst.evolutionName}</code>
                        </div>
                      ))
                    )}
                  </div>
                  <a
                    href={`/clients/${client.slug}`}
                    className="action-button"
                    style={{ fontSize: '0.8rem', minHeight: 34, padding: '0 12px', textDecoration: 'none' }}
                  >
                    Ver dashboard
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Forms ── */}
        <div className="admin-forms">
          <section className="admin-card">
            <h2 className="admin-card-title">Novo cliente</h2>
            <form action={createClient} className="admin-form">
              <div className="admin-field">
                <label>Nome</label>
                <input name="name" required placeholder="Ex: Empresa XYZ" className="admin-input" />
              </div>
              <div className="admin-field">
                <label>Slug <span className="muted">(usado na URL)</span></label>
                <input name="slug" required placeholder="Ex: empresa-xyz" className="admin-input" />
              </div>
              <div className="admin-field">
                <label>Setor <span className="muted">(opcional)</span></label>
                <input name="sector" placeholder="Ex: Varejo" className="admin-input" />
              </div>
              <button type="submit" className="action-button">Criar cliente</button>
            </form>
          </section>

          <section className="admin-card">
            <h2 className="admin-card-title">Nova instância WhatsApp</h2>
            <form action={createInstance} className="admin-form">
              <div className="admin-field">
                <label>Cliente</label>
                <select name="clientId" required className="admin-input">
                  <option value="">Selecione…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label>Label</label>
                <input name="label" required placeholder="Ex: WhatsApp Principal" className="admin-input" />
              </div>
              <div className="admin-field">
                <label>Nome na Evolution API</label>
                <input name="evolutionName" required placeholder="Ex: WHATSAPP-BAILEYS" className="admin-input" />
                <span className="admin-hint">Deve ser idêntico ao nome da instância no painel da Evolution API.</span>
              </div>
              <button type="submit" className="action-button">Criar instância</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
