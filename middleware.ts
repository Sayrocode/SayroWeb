import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return NextResponse.next();
  const { pathname } = req.nextUrl;
  // Protect admin pages (not API) behind presence of session cookie
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const hasSession = req.cookies.get('sayro.admin');
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
