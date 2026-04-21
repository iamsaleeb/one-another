import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateTag } from 'next/cache';
import { markNotificationsRead } from '@/lib/notifications/inbox';

export async function PATCH(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await markNotificationsRead(session.user.id);
  updateTag(`user-notifications-${session.user.id}`);
  return NextResponse.json({ ok: true });
}
