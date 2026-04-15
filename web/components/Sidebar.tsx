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
    href: '/conectar',
    label: 'Conectar Lojistas',
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
