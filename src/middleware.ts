import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Appliquer CORS uniquement sur les fichiers dans /uploads
  if (request.nextUrl.pathname.startsWith('/uploads/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://laboitedechocolat.clairdev.com',
      'https://2hdp.clairdev.com',
      'https://uploadfiles.clairdev.com',
    ];
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', "*");
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return response;
}

export const config = {
  matcher: ['/uploads/:path*'],
}; 