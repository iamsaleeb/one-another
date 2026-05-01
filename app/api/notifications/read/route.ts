import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';
import { markNotificationsRead } from '@/lib/notifications/inbox';

export async function PATCH(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await markNotificationsRead(session.user.id);
  revalidateTag(`user-notifications-${session.user.id}`, { expire: 0 });
  return NextResponse.json({ ok: true });
}
