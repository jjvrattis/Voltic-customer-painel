'use client';

import dynamic from 'next/dynamic';

// Leaflet não suporta SSR — importa somente no cliente
const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full" style={{ background: '#06040F' }}>
    <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }} />
  </div>
) });

export default function MapaPage() {
  return (
    <div className="flex flex-col h-screen" style={{ background: '#06040F' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(147,51,234,0.15)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold font-body mb-0.5" style={{ color: 'rgba(255,215,0,0.6)' }}>⚡ VOLTIC OPS</p>
          <h1 className="text-3xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.02em' }}>
            Mapa ao vivo
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] tracking-wider uppercase font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Atualiza a cada 10s
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <LiveMap />
      </div>
    </div>
  );
}
