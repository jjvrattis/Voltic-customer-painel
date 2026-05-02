'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: '/pedidos',
    label: 'Pedidos',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    href: '/lojistas',
    label: 'Lojistas',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
      </svg>
    ),
  },
  {
    href: '/coletores',
    label: 'Coletores',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    href: '/mapa',
    label: 'Mapa ao vivo',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    href: '/conectar',
    label: 'Conectar',
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 shrink-0 sticky top-0 h-screen flex flex-col overflow-hidden"
      style={{
        background: 'rgba(10, 8, 22, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(147, 51, 234, 0.18)',
        boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center"
        style={{ borderBottom: '1px solid rgba(147,51,234,0.12)' }}
      >
        <Image
          src="/logo.png"
          alt="Voltic"
          width={144}
          height={60}
          priority
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 10px rgba(147,51,234,0.35))',
          }}
        />
      </div>

      {/* ── Section label ─────────────────────────────── */}
      <div className="px-5 pt-5 pb-1">
        <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/20 font-body">
          Navegação
        </p>
      </div>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={
                isActive
                  ? {
                      background: 'rgba(255, 215, 0, 0.07)',
                      border: '1px solid rgba(255,215,0,0.18)',
                      color: '#FFD700',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: 'rgba(255,255,255,0.38)',
                    }
              }
            >
              <span style={{ color: isActive ? '#FFD700' : 'rgba(255,255,255,0.35)' }}>
                {icon}
              </span>
              <span
                className="text-[0.85rem] font-semibold leading-none tracking-wide"
                style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: '#FFD700', boxShadow: '0 0 6px #FFD700' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div
        className="px-4 py-3.5"
        style={{ borderTop: '1px solid rgba(147,51,234,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Voltic"
            width={62}
            height={26}
            style={{ objectFit: 'contain', opacity: 0.3 }}
          />
          <p className="text-[10px] text-white/18 font-body">· Painel Ops · © {new Date().getFullYear()}</p>
        </div>
      </div>
    </aside>
  );
}
