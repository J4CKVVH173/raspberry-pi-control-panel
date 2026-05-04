import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api';

export async function GET(request: NextRequest) {
  return proxyToBackend('/api/system/status', request);
}
