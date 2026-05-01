import { signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  Users, Plus, Pencil, Trash2, Wifi, LogOut, LogIn,
  ShieldCheck, MessageSquare, Activity, Plug, KeyRound,
} from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { createClient, updateClient, deleteClient, createInstance, deleteInstance } from './actions';

type SearchParams = Promise<{
  error?: string; ok?: string;
  edit?: string; delete?: string; deleteInst?: string;
}>;

function formatRelative(date: Date | null) {
  if (!date) return 'Nunca';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, ok, edit: editId, delete: deleteId, deleteInst: deleteInstId } = await searchParams;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [clients, connectedCount, recentMsgCount] = await Promise.all([
    prisma.client.findMany({
      include: {
        instances: true,
        users: { where: { role: 'CLIENT' }, select: { id: true, email: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.waInstance.count({ where: { status: 'CONNECTED' } }),
    prisma.message.count({ where: { sentAt: { gte: sevenDaysAgo } } }),
  ]);

  const totalInstances = clients.reduce((a, c) => a + c.instances.length, 0);
  const editingClient   = editId       ? clients.find((c) => c.id === editId)                 : null;
  const deletingClient  = deleteId     ? clients.find((c) => c.id === deleteId)               : null;
  const deletingInst    = deleteInstId ? clients.flatMap((c) => c.instances).find((i) => i.id === deleteInstId) : null;

  const okMessages: Record<string, string> = {
    cliente:            'Cliente criado com sucesso.',
    editado:            'Cliente atualizado com sucesso.',
    excluido:           'Cliente excluído com sucesso.',
    instancia:          'Instância criada com sucesso.',
    'instancia-excluida': 'Instância excluída com sucesso.',
  };

  return (
    <div className="admin-shell">

      {/* ── Header ── */}
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

      {/* ── Alerts ── */}
      {error && <div className="admin-alert admin-alert-error">{decodeURIComponent(error)}</div>}
      {ok && okMessages[ok] && <div className="admin-alert admin-alert-ok">{okMessages[ok]}</div>}

      {/* ── Stats bar ── */}
      <div className="admin-stat-bar">
        <div className="admin-stat-item">
          <Users size={18} className="admin-stat-icon" />
          <div>
            <div className="admin-stat-value">{clients.length}</div>
            <div className="admin-stat-label">Clientes</div>
          </div>
        </div>
        <div className="admin-stat-item">
          <Activity size={18} className="admin-stat-icon" style={{ color: connectedCount > 0 ? 'var(--brand)' : 'var(--muted)' }} />
          <div>
            <div className="admin-stat-value">{connectedCount}<span className="admin-stat-total"> / {totalInstances}</span></div>
            <div className="admin-stat-label">Instâncias online</div>
          </div>
        </div>
        <div className="admin-stat-item">
          <MessageSquare size={18} className="admin-stat-icon" />
          <div>
            <div className="admin-stat-value">{recentMsgCount.toLocaleString('pt-BR')}</div>
            <div className="admin-stat-label">Mensagens (7d)</div>
          </div>
        </div>
      </div>

      <div className="admin-grid">

        {/* ── Clients list ── */}
        <section className="admin-card">
          <h2 className="admin-card-title">
            <Users size={16} /> Clientes
            <span className="cv-badge" style={{ marginLeft: 4 }}>{clients.length}</span>
          </h2>

          {clients.length === 0 ? (
            <p className="muted">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <ul className="admin-client-list">
              {clients.map((client) => {
                const clientUser = client.users[0] ?? null;
                const lastActivity = client.instances.reduce<Date | null>((max, inst) => {
                  if (!inst.lastMessageAt) return max;
                  return !max || inst.lastMessageAt > max ? inst.lastMessageAt : max;
                }, null);
                const isActive = editId === client.id || deleteId === client.id;

                return (
                  <li key={client.id} className={`admin-client-row${isActive ? ' admin-client-row-active' : ''}`}>

                    {/* Client info */}
                    <div className="admin-client-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{client.name}</strong>
                        <span className="muted" style={{ fontSize: '0.78rem' }}>/{client.slug}</span>
                        {client.sector && (
                          <span className="instance-badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            {client.sector}
                          </span>
                        )}
                      </div>
                      {clientUser ? (
                        <span className="admin-user-email">
                          <KeyRound size={10} /> {clientUser.email}
                        </span>
                      ) : (
                        <span className="admin-user-email admin-user-email-missing">
                          <KeyRound size={10} /> Sem acesso configurado
                        </span>
                      )}
                      <span className="admin-last-activity">
                        Última atividade: {formatRelative(lastActivity)}
                      </span>
                    </div>

                    {/* Instances */}
                    <div className="admin-instance-list">
                      {client.instances.length === 0 ? (
                        <span className="muted" style={{ fontSize: '0.78rem' }}>Sem instâncias</span>
                      ) : client.instances.map((inst) => (
                        <div key={inst.id} className="admin-instance-row">
                          <span className="admin-instance-dot" data-status={inst.status} />
                          <span style={{ fontSize: '0.81rem', flex: 1 }}>{inst.label}</span>
                          <code style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{inst.evolutionName}</code>
                          <a
                            href={`/admin?deleteInst=${inst.id}`}
                            className="admin-inst-delete-btn"
                            title="Excluir instância"
                          >
                            <Trash2 size={11} />
                          </a>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="admin-client-actions">
                      <a
                        href={`/clients/${client.slug}`}
                        className="action-button"
                        style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <LogIn size={13} /> Entrar
                      </a>
                      <a
                        href={`/admin?edit=${client.id}`}
                        className="action-button secondary"
                        style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Pencil size={13} /> Editar
                      </a>
                      <a
                        href={`/admin?delete=${client.id}`}
                        className="admin-delete-link"
                        style={{ fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Trash2 size={13} /> Excluir
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Right column ── */}
        <div className="admin-forms">

          {/* Delete instance confirmation */}
          {deletingInst && (
            <section className="admin-card admin-danger-card">
              <h2 className="admin-card-title" style={{ color: 'var(--red)' }}>
                <Plug size={16} /> Excluir instância
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>
                Excluir <strong>{deletingInst.label}</strong> ({deletingInst.evolutionName})?
                <br />
                Todas as conversas e mensagens desta instância serão removidas permanentemente.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <a href="/admin" className="action-button secondary" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </a>
                <form action={deleteInstance} style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={deletingInst.id} />
                  <button type="submit" className="action-button cv-modal-danger" style={{ width: '100%' }}>
                    Confirmar exclusão
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* Delete client confirmation */}
          {deletingClient && (
            <section className="admin-card admin-danger-card">
              <h2 className="admin-card-title" style={{ color: 'var(--red)' }}>Excluir cliente</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>
                Excluir <strong>{deletingClient.name}</strong>?
                <br />
                Remove permanentemente <strong>todas as instâncias, conversas, mensagens e o acesso de login</strong>. Irreversível.
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

          {/* Edit client form */}
          {editingClient && !deletingClient && (() => {
            const editUser = editingClient.users?.[0] ?? null;
            return (
              <section className="admin-card">
                <h2 className="admin-card-title"><Pencil size={16} /> Editar cliente</h2>
                <form action={updateClient} className="admin-form">
                  <input type="hidden" name="id" value={editingClient.id} />

                  <div className="admin-field-group-label">Dados do cliente</div>
                  <div className="admin-field">
                    <label>Nome</label>
                    <input name="name" required defaultValue={editingClient.name} className="admin-input" />
                  </div>
                  <div className="admin-field">
                    <label>Slug <span className="muted">(URL do dashboard)</span></label>
                    <input name="slug" required defaultValue={editingClient.slug} className="admin-input" />
                  </div>
                  <div className="admin-field">
                    <label>Setor <span className="muted">(opcional)</span></label>
                    <input name="sector" defaultValue={editingClient.sector ?? ''} className="admin-input" />
                  </div>

                  <div className="admin-field-group-label" style={{ marginTop: 4 }}>
                    <KeyRound size={12} /> Acesso do cliente
                    {!editUser && <span className="admin-badge-warn">Sem acesso</span>}
                  </div>
                  <div className="admin-field">
                    <label>E-mail de login</label>
                    <input name="email" type="email" defaultValue={editUser?.email ?? ''} className="admin-input" placeholder="cliente@email.com" />
                  </div>
                  <div className="admin-field">
                    <label>Nova senha <span className="muted">(deixe em branco para não alterar)</span></label>
                    <input name="password" type="password" className="admin-input" placeholder="Mínimo 6 caracteres" />
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
            );
          })()}

          {/* Default state: create forms */}
          {!editingClient && !deletingClient && !deletingInst && (
            <>
              <section className="admin-card">
                <h2 className="admin-card-title"><Plus size={16} /> Novo cliente</h2>
                <form action={createClient} className="admin-form">
                  <div className="admin-field-group-label">Dados do cliente</div>
                  <div className="admin-field">
                    <label>Nome</label>
                    <input name="name" required placeholder="Ex: Empresa XYZ" className="admin-input" />
                  </div>
                  <div className="admin-field">
                    <label>Slug <span className="muted">(URL do dashboard)</span></label>
                    <input name="slug" required placeholder="Ex: empresa-xyz" className="admin-input" />
                  </div>
                  <div className="admin-field">
                    <label>Setor <span className="muted">(opcional)</span></label>
                    <input name="sector" placeholder="Ex: Clínica Médica" className="admin-input" />
                  </div>

                  <div className="admin-field-group-label" style={{ marginTop: 4 }}>
                    <KeyRound size={12} /> Acesso do cliente
                  </div>
                  <div className="admin-field">
                    <label>E-mail de login</label>
                    <input name="email" type="email" required placeholder="cliente@email.com" className="admin-input" />
                  </div>
                  <div className="admin-field">
                    <label>Senha</label>
                    <input name="password" type="password" required placeholder="Mínimo 6 caracteres" className="admin-input" />
                  </div>

                  <button type="submit" className="action-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} /> Criar cliente
                  </button>
                </form>
              </section>

              <section className="admin-card">
                <h2 className="admin-card-title"><Wifi size={16} /> Nova instância WhatsApp</h2>
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
                    <input name="label" required placeholder="Ex: WhatsApp Comercial" className="admin-input" />
                  </div>
                  <div className="admin-field">
                    <label>Nome na Evolution API</label>
                    <input name="evolutionName" required placeholder="Ex: WHATSAPP-BAILEYS" className="admin-input" />
                    <span className="admin-hint">Deve ser idêntico ao nome da instância no painel da Evolution API.</span>
                  </div>
                  <button type="submit" className="action-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} /> Criar instância
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
