import { env } from './env';

function base() { return (env.EVOLUTION_API_BASE_URL ?? '').replace(/\/$/, ''); }
function key()  { return env.EVOLUTION_API_KEY ?? ''; }

async function evo<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: key(),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export const evoApi = {
  createInstance: (instanceName: string) =>
    evo<{ instance: { instanceName: string; status: string } }>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName, qrcode: false, integration: 'WHATSAPP-BAILEYS' }),
    }),

  deleteInstance: (instanceName: string) =>
    evo<unknown>(`/instance/delete/${instanceName}`, { method: 'DELETE' }).catch(() => null),

  getQr: (instanceName: string) =>
    evo<{ base64?: string; code?: string; pairingCode?: string | null }>(`/instance/connect/${instanceName}`),

  connectionState: (instanceName: string) =>
    evo<{ instance?: { instanceName: string; state: string } }>(`/instance/connectionState/${instanceName}`).catch(() => null),

  logout: (instanceName: string) =>
    evo<unknown>(`/instance/logout/${instanceName}`, { method: 'DELETE' }).catch(() => null),

  setWebhook: (instanceName: string, webhookUrl: string, secret: string) =>
    evo<unknown>(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          enabled: true,
          webhookByEvents: false,
          webhookBase64: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          headers: { 'x-evolution-secret': secret },
        },
      }),
    }),

  fetchInstances: () =>
    evo<Array<{ instance: { instanceName: string; state: string } }>>('/instance/fetchInstances').catch(() => []),
};
