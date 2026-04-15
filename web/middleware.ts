import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// rotas exclusivas do painel admin — não devem ser reescritas no domínio seller
const ADMIN_PATHS = ['/dashboard', '/pedidos', '/conectar', '/onboarding'];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  if (hostname.startsWith('seller.')) {
    const isAdminPath = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

    // só reescreve se tiver um ID na URL (ex: /123 ou /123/dashboard)
    if (!pathname.startsWith('/seller') && !isAdminPath && pathname !== '/') {
      const rewriteUrl = new URL(`/seller${pathname}`, request.url);
      rewriteUrl.search = request.nextUrl.search; // preserva query params (?invite=TOKEN)
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
