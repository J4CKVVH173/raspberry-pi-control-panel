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
  
  const backendResponse = await fetch(url.toString(), {
    method: request.method,
    headers,
    body: request.body,
  });
  
  // Forward response headers (except cors-related for security)
  const responseHeaders = new Headers();
  for (const [key, value] of backendResponse.headers.entries()) {
    if (!key.toLowerCase().startsWith('access-control-') && key !== 'content-encoding') {
      responseHeaders.set(key, value);
    }
  }
  
  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}