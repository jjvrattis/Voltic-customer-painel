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
  const [m, setM] = useState<AdminMetrics | null>(null);
  useEffect(() => { void getAdminMetrics().then(setM).catch(() => null); }, []);

  if (!m) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl p-5 h-[88px] animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(147,51,234,0.1)' }} />
      ))}
    </div>
  );

  const pendingBrl = `R$ ${(m.pending_billing_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const revenueBrl = `R$ ${((m.revenue_month_cents ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Chip title="Lojistas"            value={m.sellers.total}       subtitle="cadastrados"                          color="#9333EA" />
        <Chip title="Coletores ativos"    value={m.collectors.active}   subtitle={`de ${m.collectors.total} total`}    color="#3B82F6" />
        <Chip title="Entregas hoje"       value={m.deliveries_today}    subtitle="confirmadas"                          color="#22C55E" />
        <Chip title="Ocorrências hoje"    value={m.occurrences_today ?? 0} subtitle="não entregues"                    color={(m.occurrences_today ?? 0) > 0 ? '#EF4444' : '#22C55E'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Chip title="Em rota agora"       value={m.orders_today.shipped}    subtitle="com entregador"         color="#A78BFA" />
        <Chip title="Total hoje"          value={m.orders_today.total}      subtitle="pedidos do dia"         color="#FFD700" />
        <Chip title="Receita do mês"      value={revenueBrl}                subtitle="cobranças pagas"        color="#22C55E" />
        <Chip title="Cobranças pendentes" value={pendingBrl}                subtitle={m.pending_billing_cents > 0 ? 'em aberto' : 'tudo em dia'} color={m.pending_billing_cents > 0 ? '#EF4444' : '#22C55E'} />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.1)' }} />
        <span className="text-[9px] font-body uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>pedidos</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.1)' }} />
      </div>
    </>
  );
}
