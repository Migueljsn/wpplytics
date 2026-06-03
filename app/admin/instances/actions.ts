'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { evoApi } from '@/lib/evolution-api';
import { env } from '@/lib/env';

// typedRoutes needs .next/types (generated on first dev/build run).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = (url: string) => redirect(url as any);

function webhookUrl() {
  const base = (env.APP_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/api/evolution/webhook` : '';
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createInstance(formData: FormData) {
  const clientId      = (formData.get('clientId')      as string).trim();
  const label         = (formData.get('label')         as string).trim();
  const evolutionName = (formData.get('evolutionName') as string).trim();

  if (!clientId || !label || !evolutionName)
    r('/admin/instances?error=Preencha+todos+os+campos+obrigat%C3%B3rios');

  // 1. Create in Evolution API (ignore if already exists)
  try {
    await evoApi.createInstance(evolutionName);
  } catch {
    // instance may already exist in EvoAPI — proceed anyway
  }

  // 2. Configure webhook automatically
  const wUrl = webhookUrl();
  if (wUrl) {
    try {
      await evoApi.setWebhook(evolutionName, wUrl, env.EVOLUTION_WEBHOOK_SECRET);
    } catch {
      // non-fatal
    }
  }

  // 3. Persist in DB
  try {
    await prisma.waInstance.create({
      data: { clientId, label, evolutionName, status: 'PENDING' },
    });
  } catch {
    r('/admin/instances?error=Nome+Evolution+j%C3%A1+cadastrado+ou+dados+inv%C3%A1lidos');
  }

  revalidatePath('/admin/instances');
  r('/admin/instances?ok=criada');
}

// ── Update label ──────────────────────────────────────────────────────────────

export async function updateInstance(formData: FormData) {
  const id    = (formData.get('id')    as string).trim();
  const label = (formData.get('label') as string).trim();

  if (!label) r(`/admin/instances?edit=${id}&error=Label+obrigat%C3%B3rio`);

  await prisma.waInstance.update({ where: { id }, data: { label } });

  revalidatePath('/admin/instances');
  r('/admin/instances?ok=editada');
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteInstance(formData: FormData) {
  const id = (formData.get('id') as string).trim();

  const inst = await prisma.waInstance.findUnique({ where: { id }, select: { evolutionName: true } });
  if (!inst) r('/admin/instances');

  // Delete from DB first (cascade removes messages/conversations)
  await prisma.waInstance.delete({ where: { id } });

  // Best-effort delete from EvoAPI
  await evoApi.deleteInstance(inst!.evolutionName);

  revalidatePath('/admin/instances');
  r('/admin/instances?ok=excluida');
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectInstance(formData: FormData) {
  const id = (formData.get('id') as string).trim();

  const inst = await prisma.waInstance.findUnique({ where: { id }, select: { evolutionName: true } });
  if (!inst) r('/admin/instances');

  await evoApi.logout(inst!.evolutionName);
  await prisma.waInstance.update({ where: { id }, data: { status: 'DISCONNECTED' } });

  revalidatePath('/admin/instances');
  r('/admin/instances?ok=desconectada');
}

// ── Sync statuses from Evolution API ─────────────────────────────────────────

export async function syncAllStatuses(): Promise<{ updated: number; errors: string[] }> {
  const instances = await prisma.waInstance.findMany({
    select: { id: true, evolutionName: true, status: true },
  });

  const stateMap: Record<string, string> = { open: 'CONNECTED', close: 'DISCONNECTED', connecting: 'PENDING' };
  let updated = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    instances.map(async (inst) => {
      try {
        const data = await evoApi.connectionState(inst.evolutionName);
        const rawState = data?.instance?.state ?? 'close';
        const newStatus = (stateMap[rawState] ?? 'DISCONNECTED') as 'CONNECTED' | 'DISCONNECTED' | 'PENDING';

        if (newStatus !== inst.status) {
          await prisma.waInstance.update({
            where: { id: inst.id },
            data: {
              status: newStatus,
              ...(newStatus === 'CONNECTED' && inst.status !== 'CONNECTED' ? { connectedAt: new Date() } : {}),
            },
          });
          updated++;
        }
      } catch {
        errors.push(inst.evolutionName);
      }
    }),
  );

  revalidatePath('/admin/instances');
  return { updated, errors };
}

// ── Reapply webhook ───────────────────────────────────────────────────────────

export async function reapplyWebhook(formData: FormData) {
  const id = (formData.get('id') as string).trim();
  const inst = await prisma.waInstance.findUnique({ where: { id }, select: { evolutionName: true } });
  if (!inst) r('/admin/instances');

  const wUrl = webhookUrl();
  if (!wUrl) r('/admin/instances?error=APP_URL+n%C3%A3o+configurado');

  await evoApi.setWebhook(inst!.evolutionName, wUrl, env.EVOLUTION_WEBHOOK_SECRET);

  revalidatePath('/admin/instances');
  r('/admin/instances?ok=webhook');
}
