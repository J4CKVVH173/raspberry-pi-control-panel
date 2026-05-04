import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api';

export async function POST(request: NextRequest) {
  return proxyToBackend('/api/jellyfin/logs', request);
}
