import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  // seller.expressvoltic.com.br/[id]/... → /seller/[id]/...
  if (hostname.startsWith('seller.')) {
    // já está no caminho certo, só reescreve adicionando o prefixo /seller
    if (!pathname.startsWith('/seller')) {
      return NextResponse.rewrite(new URL(`/seller${pathname}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
