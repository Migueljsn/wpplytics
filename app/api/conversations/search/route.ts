import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export type SearchContact = {
  id: string;
  contactName: string;
  remoteJid: string;
  endedAt: string;
};

export type SearchMessage = {
  convId: string;
  contactName: string;
  remoteJid: string;
  endedAt: string;
  snippet: string;
  fromMe: boolean;
  sentAt: string;
};

export type SearchResult = { contacts: SearchContact[]; messages: SearchMessage[] };

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim() ?? '';
  const instanceId = searchParams.get('instanceId') ?? '';

  if (!instanceId || !q || q.length < 2) {
    return NextResponse.json({ contacts: [], messages: [] } satisfies SearchResult);
  }

  const [contactConvs, phoneConvs, msgMatches] = await Promise.all([
    // Match by display name
    prisma.conversation.findMany({
      where: {
        instanceId,
        hidden: false,
        NOT: { remoteJid: { endsWith: '@g.us' } },
        contact: { displayName: { contains: q, mode: 'insensitive' } },
      },
      orderBy: { endedAt: 'desc' },
      take: 20,
      include: { contact: true },
    }),
    // Match by phone number in remoteJid
    prisma.conversation.findMany({
      where: {
        instanceId,
        hidden: false,
        remoteJid: { contains: q },
        NOT: { remoteJid: { endsWith: '@g.us' } },
      },
      orderBy: { endedAt: 'desc' },
      take: 20,
      include: { contact: true },
    }),
    // Match by message text content
    prisma.message.findMany({
      where: {
        instanceId,
        textContent: { contains: q, mode: 'insensitive' },
        NOT: { remoteJid: { endsWith: '@g.us' } },
      },
      orderBy: { sentAt: 'desc' },
      take: 100,
      select: { remoteJid: true, textContent: true, fromMe: true, sentAt: true },
    }),
  ]);

  // Deduplicate contacts
  const seenContactIds = new Set<string>();
  const contacts: SearchContact[] = [];
  for (const conv of [...contactConvs, ...phoneConvs]) {
    if (!seenContactIds.has(conv.id)) {
      seenContactIds.add(conv.id);
      contacts.push({
        id: conv.id,
        contactName: conv.contact?.displayName ?? conv.remoteJid.split('@')[0],
        remoteJid: conv.remoteJid,
        endedAt: conv.endedAt.toISOString(),
      });
    }
  }

  if (msgMatches.length === 0) {
    return NextResponse.json({ contacts, messages: [] } satisfies SearchResult);
  }

  // For each unique remoteJid from message results, find their most recent conversation
  const msgJids = [...new Set(msgMatches.map((m) => m.remoteJid))];
  const convsByJid = await prisma.conversation.findMany({
    where: {
      instanceId,
      hidden: false,
      remoteJid: { in: msgJids },
      NOT: { remoteJid: { endsWith: '@g.us' } },
    },
    orderBy: { endedAt: 'desc' },
    include: { contact: true },
  });

  // Take the most recent conversation per JID
  const seenMsgJids = new Set<string>();
  const convByJid = new Map<string, (typeof convsByJid)[number]>();
  for (const conv of convsByJid) {
    if (!seenMsgJids.has(conv.remoteJid)) {
      seenMsgJids.add(conv.remoteJid);
      convByJid.set(conv.remoteJid, conv);
    }
  }

  // Build message results — one entry per unique remoteJid with the matching snippet
  const seenMsgConvIds = new Set<string>();
  const messages: SearchMessage[] = [];
  for (const msg of msgMatches) {
    const conv = convByJid.get(msg.remoteJid);
    if (!conv || seenMsgConvIds.has(conv.id)) continue;
    seenMsgConvIds.add(conv.id);
    messages.push({
      convId: conv.id,
      contactName: conv.contact?.displayName ?? msg.remoteJid.split('@')[0],
      remoteJid: msg.remoteJid,
      endedAt: conv.endedAt.toISOString(),
      snippet: msg.textContent ?? '',
      fromMe: msg.fromMe,
      sentAt: msg.sentAt.toISOString(),
    });
  }

  return NextResponse.json({ contacts, messages } satisfies SearchResult);
}
