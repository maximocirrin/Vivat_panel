import { NextRequest, NextResponse } from 'next/server';
import { accessConfigured, authorized } from './lib/access';
export function proxy(request: NextRequest) {
  if (!accessConfigured()) {
    if (process.env.NODE_ENV === 'development' && !request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
    return new NextResponse('Configurá PANEL_USERNAME y PANEL_PASSWORD para habilitar el panel.', { status: 503 });
  }
  if (!authorized(request.headers.get('authorization'))) return new NextResponse('Acceso privado de Vivat', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Vivat", charset="UTF-8"', 'Cache-Control': 'no-store' } });
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
