import { NextRequest } from 'next/server';

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function proxyToBackend(path: string, request: Request): Promise<Response> {
  const url = new URL(path, BACKEND_URL);
  
  // Forward headers (except host-related)
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!key.toLowerCase().startsWith('host') && !key.toLowerCase().startsWith('x-forwarded-')) {
      headers.set(key, value as string);
    }
  }
  
  // Prepare fetch init with conditional duplex for undici/Next.js 15+ (required for POST body streams)
  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    (init as any).duplex = 'half';
  }
  const backendResponse = await fetch(url.toString(), init);
  
  // Buffer and forward response as text to handle streaming/compression reliably
  const contentType = backendResponse.headers.get('content-type') || 'application/json';
  const backendText = await backendResponse.text();
  
  const responseHeaders = new Headers(backendResponse.headers);
  // Remove CORS headers (not needed for proxy)
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-methods');
  responseHeaders.delete('access-control-allow-headers');
  responseHeaders.delete('access-control-allow-credentials');
  responseHeaders.delete('access-control-max-age');
  responseHeaders.set('content-type', contentType);
  // content-length will be set automatically by Response
  
  return new Response(backendText, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}