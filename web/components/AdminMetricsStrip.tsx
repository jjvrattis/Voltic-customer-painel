'use client';

import { useEffect, useState } from 'react';
import { getAdminMetrics, AdminMetrics } from '@/lib/api';

function Chip({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>{title}</p>
      <div>
        <p className="text-3xl font-bold leading-none" style={{ fontFamily: 'var(--font-rajdhani)', color, textShadow: `0 0 20px ${color}55` }}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-white/30 mt-1.5 font-body">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function AdminMetricsStrip() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  useEffect(() => {
    void getAdminMetrics().then(setMetrics).catch(() => null);
  }, []);

  if (!metrics) return null;

  const pendingBrl = metrics.pending_billing_cents > 0
    ? `R$ ${(metrics.pending_billing_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : 'R$ 0,00';

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Chip title="Lojistas"           value={metrics.sellers.total}     subtitle="cadastrados"                             color="#9333EA" />
        <Chip title="Coletores ativos"   value={metrics.collectors.active} subtitle={`de ${metrics.collectors.total} total`}  color="#3B82F6" />
        <Chip title="Entregas hoje"      value={metrics.deliveries_today}  subtitle="confirmadas"                             color="#22C55E" />
        <Chip title="Cobranças pendentes" value={pendingBrl}               subtitle={metrics.pending_billing_cents > 0 ? 'em aberto' : 'tudo em dia'} color={metrics.pending_billing_cents > 0 ? '#EF4444' : '#22C55E'} />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.1)' }} />
        <span className="text-[9px] font-body uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>pedidos</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.1)' }} />
      </div>
    </>
  );
}
