'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export async function createClient(formData: FormData) {
  const name = (formData.get('name') as string).trim();
  const slug = (formData.get('slug') as string).trim().toLowerCase();
  const sector = (formData.get('sector') as string).trim();

  if (!name || !slug) {
    redirect('/admin?error=Nome+e+slug+são+obrigatórios');
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirect('/admin?error=Slug+deve+conter+apenas+letras+minúsculas+números+e+hífens');
  }

  try {
    await prisma.client.create({ data: { name, slug, sector: sector || null } });
  } catch {
    redirect('/admin?error=Slug+já+existe');
  }

  revalidatePath('/admin');
  redirect('/admin?ok=cliente');
}

export async function createInstance(formData: FormData) {
  const clientId = (formData.get('clientId') as string).trim();
  const label = (formData.get('label') as string).trim();
  const evolutionName = (formData.get('evolutionName') as string).trim();

  if (!clientId || !label || !evolutionName) {
    redirect('/admin?error=Todos+os+campos+são+obrigatórios');
  }

  try {
    await prisma.waInstance.create({
      data: { clientId, label, evolutionName, status: 'PENDING' },
    });
  } catch {
    redirect('/admin?error=Nome+Evolution+já+cadastrado');
  }

  revalidatePath('/admin');
  redirect('/admin?ok=instancia');
}
