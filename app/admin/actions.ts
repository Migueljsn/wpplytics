'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// ── Clients ────────────────────────────────────────────

export async function createClient(formData: FormData) {
  const name     = (formData.get('name')     as string).trim();
  const slug     = (formData.get('slug')     as string).trim().toLowerCase();
  const sector   = (formData.get('sector')   as string).trim();
  const email    = (formData.get('email')    as string).trim();
  const password = (formData.get('password') as string);

  if (!name || !slug || !email || !password) redirect('/admin?error=Preencha+todos+os+campos+obrigatórios');
  if (!/^[a-z0-9-]+$/.test(slug))           redirect('/admin?error=Slug+inválido+(use+apenas+letras+minúsculas%2C+números+e+hífens)');
  if (password.length < 6)                   redirect('/admin?error=Senha+mínimo+6+caracteres');

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const client = await prisma.client.create({
      data: { name, slug, sector: sector || null },
    });
    await prisma.user.create({
      data: { email, hashedPassword, name, role: 'CLIENT', clientId: client.id },
    });
  } catch (e: unknown) {
    const msg = (e as { code?: string }).code === 'P2002'
      ? 'Slug+ou+email+já+cadastrado'
      : 'Erro+ao+criar+cliente';
    redirect(`/admin?error=${msg}`);
  }

  revalidatePath('/admin');
  redirect('/admin?ok=cliente');
}

export async function updateClient(formData: FormData) {
  const id       = (formData.get('id')       as string).trim();
  const name     = (formData.get('name')     as string).trim();
  const slug     = (formData.get('slug')     as string).trim().toLowerCase();
  const sector   = (formData.get('sector')   as string).trim();
  const email    = (formData.get('email')    as string).trim();
  const password = (formData.get('password') as string).trim();

  if (!name || !slug)                   redirect(`/admin?edit=${id}&error=Nome+e+slug+são+obrigatórios`);
  if (!/^[a-z0-9-]+$/.test(slug))      redirect(`/admin?edit=${id}&error=Slug+inválido`);
  if (password && password.length < 6) redirect(`/admin?edit=${id}&error=Senha+mínimo+6+caracteres`);

  try {
    await prisma.client.update({ where: { id }, data: { name, slug, sector: sector || null } });

    if (email) {
      const existingUser = await prisma.user.findFirst({ where: { clientId: id } });
      const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email,
            name,
            ...(hashedPassword ? { hashedPassword } : {}),
          },
        });
      } else if (password) {
        await prisma.user.create({
          data: { email, hashedPassword: hashedPassword!, name, role: 'CLIENT', clientId: id },
        });
      }
    }
  } catch {
    redirect(`/admin?edit=${id}&error=Slug+ou+email+já+existe`);
  }

  revalidatePath('/admin');
  redirect('/admin?ok=editado');
}

export async function deleteClient(formData: FormData) {
  const id = (formData.get('id') as string).trim();
  await prisma.client.delete({ where: { id } });
  revalidatePath('/admin');
  redirect('/admin?ok=excluido');
}

// ── Instances ──────────────────────────────────────────

export async function createInstance(formData: FormData) {
  const clientId      = (formData.get('clientId')      as string).trim();
  const label         = (formData.get('label')         as string).trim();
  const evolutionName = (formData.get('evolutionName') as string).trim();

  if (!clientId || !label || !evolutionName) redirect('/admin?error=Todos+os+campos+são+obrigatórios');

  try {
    await prisma.waInstance.create({ data: { clientId, label, evolutionName, status: 'PENDING' } });
  } catch {
    redirect('/admin?error=Nome+Evolution+já+cadastrado');
  }

  revalidatePath('/admin');
  redirect('/admin?ok=instancia');
}

export async function deleteInstance(formData: FormData) {
  const id = (formData.get('id') as string).trim();
  await prisma.waInstance.delete({ where: { id } });
  revalidatePath('/admin');
  redirect('/admin?ok=instancia-excluida');
}
