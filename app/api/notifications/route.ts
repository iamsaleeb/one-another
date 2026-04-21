import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getInboxNotifications } from '@/lib/notifications/inbox';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const rawPage = Number(searchParams.get('page'));
  const rawPageSize = Number(searchParams.get('pageSize'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize >= 1 ? Math.min(50, Math.floor(rawPageSize)) : 20;

  const notifications = await getInboxNotifications({ userId: session.user.id, page, pageSize });
  return NextResponse.json({ notifications, page, pageSize });
}
