import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { cacheManager } from '@/lib/services/cache-manager';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifySession(session);
  if (!payload || (payload.role !== 'SUPER_ADMIN' && payload.role !== 'ANALYST')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = cacheManager.getStats();
  
  return NextResponse.json({
    stats,
    timestamp: Date.now()
  });
}
