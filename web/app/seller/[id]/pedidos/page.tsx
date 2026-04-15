'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPedidos, SellerOrder } from '../../../../lib/sellerApi';

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  pending:       { label: 'Pendente',        color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.3)' },
  ready_to_ship: { label: 'Pronto p/ envio', color: '#FFD700',               bg: 'rgba(255,215,0,0.07)',   border: 'rgba(255,215,0,0.2)',   dot: '#FFD700' },
  collected:     { label: 'Coletado',        color: '#C084FC',               bg: 'rgba(147,51,234,0.08)', border: 'rgba(147,51,234,0.22)', dot: '#9333EA' },
  shipped:       { label: 'Enviado',         color: '#93C5FD',               bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)',  dot: '#3B82F6' },
  delivered:     { label: 'Entregue',        color: '#86EFAC',               bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.18)',  dot: '#22C55E' },
  cancelled:     { label: 'Cancelado',       color: '#FCA5A5',               bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.18)', dot: '#EF4444' },
};

const FILTER_OPTIONS = [
  { value: '',              label: 'Todos' },
  { value: 'ready_to_ship', label: 'Prontos' },
  { value: 'collected',     label: 'Coletados' },
  { value: 'shipped',       label: 'Enviados' },
  { value: 'delivered',     label: 'Entregues' },
  { value: 'cancelled',     label: 'Cancelados' },
];

function PlatformBadge({ platform }: { platform: string }) {
  const isML = platform === 'mercadolivre';
  return (
    <span
      className="text-[9px] font-bold tracking-wide font-body"
      style={{ color: isML ? 'rgba(252,211,77,0.6)' : 'rgba(251,146,60,0.6)' }}
    >
      {isML ? 'ML' : 'SHOPEE'}
    </span>
  );
}

function OrderCard({ order }: { order: SellerOrder }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending'];

  return (
    <div
      className="rounded-2xl p-4 space-y-3 transition-all duration-200 active:scale-[0.99]"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(147,51,234,0.14)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <code
          className="text-xs font-mono"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          #{order.external_order_id}
        </code>

        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold font-body"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
          />
          {cfg.label}
        </span>
      </div>

      {/* Tracking */}
      {order.tracking_number && (
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'rgba(255,255,255,0.2)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25" />
          </svg>
          <code
            className="text-xs font-mono truncate"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {order.tracking_number}
          </code>
        </div>
      )}

      {/* Address */}
      {order.pickup_address && (
        <div className="flex items-start gap-2">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'rgba(255,255,255,0.2)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p
            className="text-xs font-body truncate"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {order.pickup_address}
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <PlatformBadge platform={order.platform} />
        <span
          className="text-[10px] font-body"
          style={{ color: 'rgba(255,255,255,0.18)' }}
        >
          {new Date(order.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export default function SellerPedidosPage() {
  const [orders,  setOrders]  = useState<SellerOrder[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getPedidos({ status: status || undefined, page, limit: 20 });
      setOrders(data.items);
      setTotal(data.total);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    setLoading(true);
    void load();
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => { setPage(1); }, [status]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-4 space-y-4 animate-fade-in">

      {/* ── Filter pills ────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FILTER_OPTIONS.map(opt => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={{
                fontFamily: 'var(--font-rajdhani), system-ui',
                letterSpacing: '0.04em',
                background: active ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(147,51,234,0.15)',
                color: active ? '#FFD700' : 'rgba(255,255,255,0.35)',
                boxShadow: active ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Count label */}
      {!loading && (
        <p className="text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {total} pedido{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── List ────────────────────────────────────── */}
      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }}
          />
          <p className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Carregando...
          </p>
        </div>
      ) : error ? (
        <div
          className="rounded-2xl p-4 text-sm font-body"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}
        >
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(147,51,234,0.15)' }}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.15)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6" />
            </svg>
          </div>
          <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Nenhum pedido encontrado
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map(o => <OrderCard key={o.id} order={o} />)}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────── */}
      {total > 20 && (
        <div className="flex items-center justify-between pt-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl text-xs font-body transition-all duration-200 disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(147,51,234,0.2)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            ← Anterior
          </button>
          <span className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl text-xs font-body transition-all duration-200 disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(147,51,234,0.2)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
