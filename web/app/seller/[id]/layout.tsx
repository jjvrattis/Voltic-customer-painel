'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname } from 'next/navigation';

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 relative"
    >
      {/* Active glow bar on top */}
      {active && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
          style={{ background: '#FFD700', boxShadow: '0 0 8px #FFD700' }}
        />
      )}

      <span
        className="w-[22px] h-[22px] transition-all duration-200"
        style={{ color: active ? '#FFD700' : 'rgba(255,255,255,0.3)' }}
      >
        {icon}
      </span>

      <span
        className="text-[10px] font-semibold tracking-wide transition-colors duration-200"
        style={{
          fontFamily: 'var(--font-rajdhani), system-ui',
          color: active ? '#FFD700' : 'rgba(255,255,255,0.28)',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams<{ id: string }>();
  const pathname = usePathname();
  const base     = `/seller/${params.id}`;

  const nav = [
    {
      href: `${base}/dashboard`,
      label: 'Início',
      key: 'dashboard',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: `${base}/pedidos`,
      label: 'Pedidos',
      key: 'pedidos',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
    },
    {
      href: `${base}/financeiro`,
      label: 'Financeiro',
      key: 'financeiro',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(147,51,234,0.18) 0%, transparent 65%), #06040F',
        color: '#fff',
      }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-2.5"
        style={{
          background: 'rgba(6,4,15,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(147,51,234,0.15)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Real logo */}
        <Image
          src="/logo.png"
          alt="Voltic"
          width={110}
          height={44}
          priority
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 8px rgba(147,51,234,0.3))',
          }}
        />

        <div className="flex-1" />


        {/* Pulsing live dot */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#FFD700', boxShadow: '0 0 6px #FFD700' }}
          />
          <span
            className="text-[9px] uppercase tracking-widest font-body"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            ao vivo
          </span>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* ── Bottom nav ──────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 flex"
        style={{
          background: 'rgba(6,4,15,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(147,51,234,0.15)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {nav.map(item => (
          <NavItem
            key={item.key}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.includes(`/${item.key}`)}
          />
        ))}
      </nav>
    </div>
  );
}
