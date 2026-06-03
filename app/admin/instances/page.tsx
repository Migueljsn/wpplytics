import { signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  Wifi, Plus, Pencil, Trash2, LogOut, ShieldCheck,
  Plug, ArrowLeft, Activity, RefreshCw, PhoneOff,
} from 'lucide-react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { ConnectButton } from './connect-button';
import { createInstance, updateInstance, deleteInstance, disconnectInstance, reapplyWebhook } from './actions';

type SearchParams = Promise<{
  error?: string;
  ok?: string;
  edit?: string;
  delete?: string;
}>;

const STATUS_LABEL: Record<string, string> = {
  CONNECTED:    'Conectado',
  DISCONNECTED: 'Desconectado',
  PENDING:      'Pendente',
  ERROR:        'Erro',
};

const STATUS_CSS: Record<string, string> = {
  CONNECTED:    'status-connected',
  DISCONNECTED: 'status-disconnected',
  PENDING:      'status-pending',
  ERROR:        'status-error',
};

function formatRelative(date: Date | null) {
  if (!date) return '—';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1)   return 'agora';
  if (mins < 60)  return `${mins}min atrás`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default async function InstancesPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, ok, edit: editId, delete: deleteId } = await searchParams;

  const [instances, clients] = await Promise.all([
    prisma.waInstance.findMany({
      include: { client: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ client: { name: 'asc' } }, { label: 'asc' }],
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const connectedCount    = instances.filter((i) => i.status === 'CONNECTED').length;
  const disconnectedCount = instances.filter((i) => i.status === 'DISCONNECTED').length;
  const pendingCount      = instances.filter((i) => i.status === 'PENDING').length;

  const editingInst  = editId   ? instances.find((i) => i.id === editId)   : null;
  const deletingInst = deleteId ? instances.find((i) => i.id === deleteId) : null;

  const okMessages: Record<string, string> = {
    criada:       'Instância criada com sucesso.',
    editada:      'Instância atualizada.',
    excluida:     'Instância excluída.',
    desconectada: 'Instância desconectada.',
    webhook:      'Webhook reconfigurado.',
  };

  return (
    <div className="admin-shell">

      {/* ── Header ── */}
      <header className="admin-header">
        <div>
          <p className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} style={{ opacity: 0.7 }} />
            WPPlytics
            <a href="/admin" className="admin-nav-link" style={{ marginLeft: 4 }}>
              <ArrowLeft size={12} /> Admin
            </a>
          </p>
          <h1 className="admin-title">Instâncias WhatsApp</h1>
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
              <button type="submit" className="admin-signout-btn" title="Sair">
                <LogOut size={13} /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Alerts ── */}
      {error && <div className="admin-alert admin-alert-error">{decodeURIComponent(error)}</div>}
      {ok && okMessages[ok] && <div className="admin-alert admin-alert-ok">{okMessages[ok]}</div>}

      {/* ── Stats ── */}
      <div className="admin-stat-bar">
        <div className="admin-stat-item">
          <Wifi size={18} className="admin-stat-icon" />
          <div>
            <div className="admin-stat-value">{instances.length}</div>
            <div className="admin-stat-label">Total</div>
          </div>
        </div>
        <div className="admin-stat-item">
          <Activity size={18} className="admin-stat-icon" style={{ color: connectedCount > 0 ? 'var(--brand)' : 'var(--muted)' }} />
          <div>
            <div className="admin-stat-value">{connectedCount}</div>
            <div className="admin-stat-label">Conectadas</div>
          </div>
        </div>
        <div className="admin-stat-item">
          <Plug size={18} className="admin-stat-icon" style={{ color: disconnectedCount > 0 ? 'var(--red)' : 'var(--muted)' }} />
          <div>
            <div className="admin-stat-value">{disconnectedCount}</div>
            <div className="admin-stat-label">Desconectadas</div>
          </div>
        </div>
        <div className="admin-stat-item">
          <RefreshCw size={18} className="admin-stat-icon" style={{ color: pendingCount > 0 ? 'var(--warn)' : 'var(--muted)' }} />
          <div>
            <div className="admin-stat-value">{pendingCount}</div>
            <div className="admin-stat-label">Pendentes</div>
          </div>
        </div>
      </div>

      <div className="admin-grid" style={{ gridTemplateColumns: '1fr 360px' }}>

        {/* ── Instances table ── */}
        <section className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={16} style={{ opacity: 0.6 }} />
            <h2 className="admin-card-title" style={{ margin: 0 }}>
              Instâncias
              <span className="cv-badge" style={{ marginLeft: 4 }}>{instances.length}</span>
            </h2>
          </div>

          {instances.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Wifi size={32} style={{ opacity: 0.15, marginBottom: 12 }} />
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                Nenhuma instância cadastrada.<br />
                Crie a primeira usando o formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="inst-table-wrap">
              <table className="inst-table">
                <thead>
                  <tr>
                    <th>Instância</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Última atividade</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((inst) => (
                    <tr key={inst.id} className={deleteId === inst.id || editId === inst.id ? 'inst-row-active' : ''}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{inst.label}</div>
                        <code className="inst-evo-name">{inst.evolutionName}</code>
                        {inst.phoneNumber && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                            {inst.phoneNumber}
                          </div>
                        )}
                      </td>
                      <td>
                        <a
                          href={`/clients/${inst.client.slug}`}
                          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}
                        >
                          {inst.client.name}
                        </a>
                      </td>
                      <td>
                        <span className={`instance-status-dot ${STATUS_CSS[inst.status] ?? ''}`}>
                          {STATUS_LABEL[inst.status] ?? inst.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                          {formatRelative(inst.lastMessageAt)}
                        </span>
                      </td>
                      <td>
                        <div className="inst-actions">
                          {/* Connect */}
                          {inst.status !== 'CONNECTED' && (
                            <ConnectButton
                              evolutionName={inst.evolutionName}
                              instanceId={inst.id}
                              label={inst.label}
                            />
                          )}

                          {/* Disconnect */}
                          {inst.status === 'CONNECTED' && (
                            <form action={disconnectInstance}>
                              <input type="hidden" name="id" value={inst.id} />
                              <button
                                type="submit"
                                className="action-button secondary"
                                style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 12px', gap: 4 }}
                                title="Desconectar"
                              >
                                <PhoneOff size={13} /> Desconectar
                              </button>
                            </form>
                          )}

                          {/* Reapply webhook */}
                          <form action={reapplyWebhook}>
                            <input type="hidden" name="id" value={inst.id} />
                            <button
                              type="submit"
                              className="action-button secondary"
                              style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 10px', gap: 4 }}
                              title="Reconfigurar webhook"
                            >
                              <RefreshCw size={13} />
                            </button>
                          </form>

                          {/* Edit */}
                          <a
                            href={`/admin/instances?edit=${inst.id}`}
                            className="action-button secondary"
                            style={{ fontSize: '0.8rem', minHeight: 32, padding: '0 10px', gap: 4, textDecoration: 'none' }}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </a>

                          {/* Delete */}
                          <a
                            href={`/admin/instances?delete=${inst.id}`}
                            className="admin-delete-link"
                            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, minHeight: 32 }}
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Right column ── */}
        <div className="admin-forms">

          {/* Delete confirmation */}
          {deletingInst && (
            <section className="admin-card admin-danger-card">
              <h2 className="admin-card-title" style={{ color: 'var(--red)' }}>
                <Trash2 size={16} /> Excluir instância
              </h2>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text)' }}>
                Excluir <strong>{deletingInst.label}</strong>?<br />
                Todas as conversas e mensagens serão removidas permanentemente.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <a href="/admin/instances" className="action-button secondary" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </a>
                <form action={deleteInstance} style={{ flex: 1 }}>
                  <input type="hidden" name="id" value={deletingInst.id} />
                  <button type="submit" className="action-button cv-modal-danger" style={{ width: '100%' }}>
                    Confirmar
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* Edit form */}
          {editingInst && !deletingInst && (
            <section className="admin-card">
              <h2 className="admin-card-title"><Pencil size={16} /> Editar instância</h2>
              <form action={updateInstance} className="admin-form">
                <input type="hidden" name="id" value={editingInst.id} />

                <div className="admin-field">
                  <label>Label</label>
                  <input
                    name="label"
                    required
                    defaultValue={editingInst.label}
                    className="admin-input"
                    placeholder="Ex: WhatsApp Comercial"
                  />
                </div>
                <div className="admin-field">
                  <label>Nome na Evolution API</label>
                  <input
                    value={editingInst.evolutionName}
                    disabled
                    className="admin-input"
                    style={{ opacity: 0.55, cursor: 'not-allowed' }}
                  />
                  <span className="admin-hint">O nome da Evolution não pode ser alterado.</span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <a href="/admin/instances" className="action-button secondary" style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                    Cancelar
                  </a>
                  <button type="submit" className="action-button" style={{ flex: 1 }}>
                    Salvar
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Create form — shown when no modal active */}
          {!editingInst && !deletingInst && (
            <section className="admin-card">
              <h2 className="admin-card-title"><Plus size={16} /> Nova instância</h2>
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
                  <input
                    name="label"
                    required
                    placeholder="Ex: WhatsApp Comercial"
                    className="admin-input"
                  />
                </div>
                <div className="admin-field">
                  <label>Nome na Evolution API</label>
                  <input
                    name="evolutionName"
                    required
                    placeholder="Ex: EMPRESA-WHATSAPP"
                    className="admin-input"
                  />
                  <span className="admin-hint">
                    Será criado na Evolution API automaticamente com este nome.
                    Use apenas letras maiúsculas, números e hífens.
                  </span>
                </div>

                <button
                  type="submit"
                  className="action-button"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} /> Criar instância
                </button>
              </form>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  <strong>O que acontece ao criar:</strong><br />
                  1. Instância criada na Evolution API<br />
                  2. Webhook configurado automaticamente<br />
                  3. Registro salvo no banco de dados
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
