import { signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Users, Plus, Pencil, Trash2, Wifi, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { createClient, updateClient, deleteClient, createInstance } from './actions';

type SearchParams = Promise<{ error?: string; ok?: string; edit?: string; delete?: string }>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, ok, edit: editId, delete: deleteId } = await searchParams;

  const clients = await prisma.client.findMany({
    include: { instances: true },
    orderBy: { name: 'asc' },
  });

  const editingClient = editId ? clients.find((c) => c.id === editId) : null;
  const deletingClient = deleteId ? clients.find((c) => c.id === deleteId) : null;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} style={{ opacity: 0.7 }} /> WPPlytics
          </p>
          <h1 className="admin-title">Painel de Administração</h1>
        </div>
        <div className="admin-header-controls">
          <ThemeToggle />
          <div className="admin-user-chip">
            <div className="admin-user-avatar">AD</div>
            <span className="admin-user-label">Admin</span>
            <form action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}>
              <button type="submit" className="admin-signout-btn" title="Sair da conta">
                <LogOut size={13} /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {error && <div className="admin-alert admin-alert-error">{decodeURIComponent(error)}</div>}
      {ok === 'cliente'   && <div className="admin-alert admin-alert-ok">Cliente criado com sucesso.</div>}
      {ok === 'editado'   && <div className="admin-alert admin-alert-ok">Cliente atualizado com sucesso.</div>}
      {ok === 'excluido'  && <div className="admin-alert admin-alert-ok">Cliente excluído com sucesso.</div>}
      {ok === 'instancia' && <div className="admin-alert admin-alert-ok">Instância criada com sucesso.</div>}

      <div className="admin-grid">

        {/* ── Clients list ── */}
        <section className="admin-card">
          <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} /> Clientes
            <span className="cv-badge" style={{ marginLeft: 4 }}>{clients.length}</span>
          </h2>

          {clients.length === 0 ? (
            <p className="muted">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <ul className="admin-client-list">
              {clients.map((client) => (
                <li key={client.id} className={`admin-client-row${client.id === editId || client.id === deleteId ? ' admin-client-row-active' : ''}`}>
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
                    ) : client.instances.map((inst) => (
                      <div key={inst.id} className="admin-instance-row">
                        <span className="admin-instance-dot" data-status={inst.status} />
                        <span style={{ fontSize: '0.82rem' }}>{inst.label}</span>
                        <code style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{inst.evolutionName}</code>
                      </div>
                    ))}
                  </div>

                  <div className="admin-client-actions">
                    <a href={`/clients/${client.slug}`} className="action-button" style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <LayoutDashboard size={13} /> Dashboard
                    </a>
                    <a href={`/admin?edit=${client.id}`} className="action-button secondary" style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Pencil size={13} /> Editar
                    </a>
                    <a href={`/admin?delete=${client.id}`} className="admin-delete-link" style={{ fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={13} /> Excluir
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Right column ── */}
        <div className="admin-forms">

          {/* Delete confirmation */}
          {deletingClient && (
            <section className="admin-card admin-danger-card">
              <h2 className="admin-card-title" style={{ color: 'var(--red)' }}>Excluir cliente</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>
                Você está prestes a excluir <strong>{deletingClient.name}</strong>.
                <br />
                Isso vai remover permanentemente <strong>todas as instâncias, conversas e mensagens</strong> associadas. Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <a href="/admin" className="action-button secondary" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </a>
                <form action={deleteClient} style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={deletingClient.id} />
                  <button type="submit" className="action-button cv-modal-danger" style={{ width: '100%' }}>
                    Confirmar exclusão
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* Edit form */}
          {editingClient && !deletingClient && (
            <section className="admin-card">
              <h2 className="admin-card-title">Editar cliente</h2>
              <form action={updateClient} className="admin-form">
                <input type="hidden" name="id" value={editingClient.id} />
                <div className="admin-field">
                  <label>Nome</label>
                  <input name="name" required defaultValue={editingClient.name} className="admin-input" />
                </div>
                <div className="admin-field">
                  <label>Slug <span className="muted">(altera a URL do dashboard)</span></label>
                  <input name="slug" required defaultValue={editingClient.slug} className="admin-input" />
                </div>
                <div className="admin-field">
                  <label>Setor <span className="muted">(opcional)</span></label>
                  <input name="sector" defaultValue={editingClient.sector ?? ''} className="admin-input" />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a href="/admin" className="action-button secondary" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                    Cancelar
                  </a>
                  <button type="submit" className="action-button" style={{ flex: 1 }}>
                    Salvar
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Create forms (default state) */}
          {!editingClient && !deletingClient && (
            <>
              <section className="admin-card">
                <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> Novo cliente</h2>
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
                  <button type="submit" className="action-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Criar cliente</button>
                </form>
              </section>

              <section className="admin-card">
                <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wifi size={16} /> Nova instância WhatsApp</h2>
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
                  <button type="submit" className="action-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Criar instância</button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
