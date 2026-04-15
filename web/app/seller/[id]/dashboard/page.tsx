'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDashboard, DashboardData } from '../../../../lib/sellerApi';

// ─── Status config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  ready_to_ship: {
    label: 'Pronto p/ envio',
    color: '#FFD700',
    bg:    'rgba(255,215,0,0.07)',
    border:'rgba(255,215,0,0.2)',
    dot:   '#FFD700',
  },
  collected: {
    label: 'Coletado',
    color: '#C084FC',
    bg:    'rgba(147,51,234,0.08)',
    border:'rgba(147,51,234,0.22)',
    dot:   '#9333EA',
  },
  shipped: {
    label: 'Enviado',
    color: '#93C5FD',
    bg:    'rgba(59,130,246,0.08)',
    border:'rgba(59,130,246,0.2)',
    dot:   '#3B82F6',
  },
  delivered: {
    label: 'Entregue',
    color: '#86EFAC',
    bg:    'rgba(34,197,94,0.07)',
    border:'rgba(34,197,94,0.18)',
    dot:   '#22C55E',
  },
  cancelled: {
    label: 'Cancelado',
    color: '#FCA5A5',
    bg:    'rgba(239,68,68,0.07)',
    border:'rgba(239,68,68,0.18)',
    dot:   '#EF4444',
  },
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── StatCard ─────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  bg,
  border,
  dot,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  dot: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 transition-all duration-300"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: `0 2px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest font-body"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {label}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dot, boxShadow: `0 0 6px ${dot}` }}
        />
      </div>
      <span
        className="text-4xl font-bold leading-none"
        style={{
          fontFamily: 'var(--font-rajdhani), system-ui',
          color,
          textShadow: `0 0 20px ${color}44`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function SellerDashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await getDashboard();
      setData(d);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 20_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }}
        />
        <p className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Carregando...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div
          className="rounded-2xl p-4 text-sm font-body"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#FCA5A5',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const { orders_today, credit } = data!;
  const statuses = ['ready_to_ship', 'collected', 'shipped', 'delivered', 'cancelled'] as const;

  const pct = Math.max(2, credit.pct_remaining);
  const isLow = credit.low_credit;

  return (
    <div className="p-4 space-y-5 animate-fade-in">

      {/* ── Section: Hoje ──────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, #9333EA, #FFD700)' }}
            />
            <h2
              className="text-sm font-bold tracking-wide"
              style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: 'rgba(255,255,255,0.7)' }}
            >
              Hoje
            </h2>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-body"
            style={{
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.18)',
              color: '#FFD700',
            }}
          >
            {orders_today.total} pedidos
          </span>
        </div>

        <div
          className="grid grid-cols-2 gap-2.5"
          style={{ isolation: 'isolate' }}
        >
          {statuses.map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <StatCard
                key={s}
                label={cfg.label}
                value={orders_today[s] as number}
                color={cfg.color}
                bg={cfg.bg}
                border={cfg.border}
                dot={cfg.dot}
              />
            );
          })}

          {/* Total card — spans 2 cols */}
          <div
            className="col-span-2 rounded-2xl p-4 flex items-center justify-between transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(147,51,234,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-widest font-body"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Total do dia
            </span>
            <span
              className="text-4xl font-bold"
              style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: '#fff' }}
            >
              {orders_today.total}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section: Crédito ───────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-1 h-4 rounded-full"
            style={{ background: isLow ? 'linear-gradient(180deg, #EF4444, #F97316)' : 'linear-gradient(180deg, #9333EA, #FFD700)' }}
          />
          <h2
            className="text-sm font-bold tracking-wide"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: 'rgba(255,255,255,0.7)' }}
          >
            Crédito do ciclo
          </h2>
        </div>

        <div
          className="rounded-2xl p-4 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${isLow ? 'rgba(239,68,68,0.2)' : 'rgba(147,51,234,0.15)'}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Utilizado
              </span>
              <span
                className="font-semibold font-body"
                style={{ color: isLow ? '#F87171' : '#FFD700' }}
              >
                {credit.pct_remaining}% restante
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isLow
                    ? 'linear-gradient(90deg, #EF4444, #F97316)'
                    : 'linear-gradient(90deg, #9333EA, #FFD700)',
                  boxShadow: isLow
                    ? '0 0 8px rgba(239,68,68,0.5)'
                    : '0 0 8px rgba(255,215,0,0.4)',
                }}
              />
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Limite',  value: credit.limit,     accent: false },
              { label: 'Usados',  value: credit.used,      accent: false },
              { label: 'Restam',  value: credit.remaining, accent: true  },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className="rounded-xl p-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p
                  className="text-lg font-bold leading-tight"
                  style={{
                    fontFamily: 'var(--font-rajdhani), system-ui',
                    color: accent ? (isLow ? '#F87171' : '#FFD700') : '#fff',
                  }}
                >
                  {value}
                </p>
                <p className="text-[10px] font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Cycle dates */}
          <div
            className="text-center text-[10px] font-body pt-1"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            Ciclo:{' '}
            {new Date(credit.cycle_start + 'T00:00:00').toLocaleDateString('pt-BR')}
            {' → '}
            {new Date(credit.cycle_end + 'T00:00:00').toLocaleDateString('pt-BR')}
          </div>

          {/* Low credit warning */}
          {isLow && (
            <div
              className="rounded-xl p-3 text-xs text-center font-body"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#FCA5A5',
              }}
            >
              ⚠ Crédito baixo — acesse <strong>Financeiro</strong> para regularizar
            </div>
          )}
        </div>
      </section>


    </div>
  );
}
