'use client';

import { useCallback, useEffect, useState } from 'react';
import { getOrders, Order, OrderFilters, OrderStatus, Platform } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

const POLOS = ['Brás', '25 de Março', 'Santa Efigênia', 'Bom Retiro'];
const LIMIT = 15;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const isML = platform === 'mercadolivre';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={
        isML
          ? { background: 'rgba(234,179,8,0.12)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.2)' }
          : { background: 'rgba(249,115,22,0.1)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.2)' }
      }
    >
      {isML ? 'ML' : 'Shopee'}
    </span>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[9px] font-semibold uppercase tracking-[0.15em] font-body"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm rounded-xl px-3 py-2 transition-all duration-200 font-body focus:outline-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${value ? 'rgba(255,215,0,0.3)' : 'rgba(147,51,234,0.18)'}`,
          color: value ? '#FFD700' : 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <option value="" style={{ background: '#0C0A1A', color: '#fff' }}>Todos</option>
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0C0A1A', color: '#fff' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PedidosPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [statusFilter,   setStatusFilter]   = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [poloFilter,     setPoloFilter]     = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: OrderFilters = {
        page, limit: LIMIT,
        ...(statusFilter   && { status:   statusFilter   as OrderStatus }),
        ...(platformFilter && { platform: platformFilter as Platform }),
        ...(poloFilter     && { polo:     poloFilter }),
      };
      const result = await getOrders(filters);
      setOrders(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter, poloFilter]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusFilter, platformFilter, poloFilter]);

  const totalPages = Math.ceil(total / LIMIT);
  const hasFilters = !!(statusFilter || platformFilter || poloFilter);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold font-body mb-1" style={{ color: 'rgba(255,215,0,0.6)' }}>
          ⚡ VOLTIC OPS
        </p>
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-4xl font-bold leading-none text-white"
              style={{ fontFamily: 'var(--font-rajdhani), system-ui', letterSpacing: '0.02em' }}
            >
              Pedidos
            </h1>
            <p className="text-sm font-body mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {loading ? 'Carregando...' : total > 0 ? `${total} pedidos encontrados` : 'Nenhum pedido'}
            </p>
          </div>

          {/* Total badge */}
          {!loading && total > 0 && (
            <div
              className="px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(255,215,0,0.07)',
                border: '1px solid rgba(255,215,0,0.18)',
              }}
            >
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: '#FFD700' }}
              >
                {total}
              </span>
              <span className="text-xs text-white/25 font-body ml-1.5">pedidos</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(147,51,234,0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ready_to_ship', label: 'Pronto p/ coletar' },
              { value: 'collected',     label: 'Coletado' },
              { value: 'pending',       label: 'Pendente' },
              { value: 'shipped',       label: 'Enviado' },
              { value: 'delivered',     label: 'Entregue' },
              { value: 'cancelled',     label: 'Cancelado' },
            ]}
          />
          <FilterSelect
            label="Plataforma"
            value={platformFilter}
            onChange={setPlatformFilter}
            options={[
              { value: 'mercadolivre', label: 'Mercado Livre' },
              { value: 'shopee',       label: 'Shopee' },
            ]}
          />
          <FilterSelect
            label="Polo"
            value={poloFilter}
            onChange={setPoloFilter}
            options={POLOS.map(p => ({ value: p, label: p }))}
          />
        </div>

        {hasFilters && (
          <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(147,51,234,0.1)' }}>
            <span className="text-[10px] text-white/25 font-body">Filtros ativos:</span>
            {statusFilter   && <Chip label={statusFilter.replace('_', ' ')}   onRemove={() => setStatusFilter('')} />}
            {platformFilter && <Chip label={platformFilter}                    onRemove={() => setPlatformFilter('')} />}
            {poloFilter     && <Chip label={poloFilter}                        onRemove={() => setPoloFilter('')} />}
            <button
              onClick={() => { setStatusFilter(''); setPlatformFilter(''); setPoloFilter(''); }}
              className="ml-auto text-[10px] font-body transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(147,51,234,0.15)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {loading ? (
          <div className="py-20 text-center">
            <div
              className="inline-block w-8 h-8 rounded-full border-2 animate-spin mb-4"
              style={{ borderColor: 'rgba(255,215,0,0.3)', borderTopColor: '#FFD700' }}
            />
            <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Carregando pedidos...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-body mb-3" style={{ color: '#F87171' }}>{error}</p>
            <button
              onClick={() => void fetchOrders()}
              className="text-xs font-body px-4 py-2 rounded-xl transition-colors"
              style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' }}
            >
              Tentar novamente
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Nenhum pedido encontrado para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(147,51,234,0.12)' }}>
                  {['Plataforma', 'Pedido', 'Lojista', 'Tracking', 'Polo', 'Status', 'Horário'].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] font-body whitespace-nowrap"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr
                    key={order.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: '1px solid rgba(147,51,234,0.07)' }}
                  >
                    <td className="px-5 py-3.5"><PlatformBadge platform={order.platform} /></td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {order.external_order_id}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {order.seller_id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {order.tracking_number ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {order.polo ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-body whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {formatDate(order.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────── */}
        {!loading && !error && totalPages > 1 && (
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(147,51,234,0.1)' }}
          >
            <p className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <NavBtn disabled={page === 1}          onClick={() => setPage(p => Math.max(1, p - 1))}>← Anterior</NavBtn>
              <NavBtn disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima →</NavBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-body cursor-pointer transition-colors"
      style={{
        background: 'rgba(255,215,0,0.08)',
        border: '1px solid rgba(255,215,0,0.18)',
        color: '#FFD700',
      }}
      onClick={onRemove}
    >
      {label}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

function NavBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-xs font-body rounded-xl transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(147,51,234,0.2)',
        color: 'rgba(255,255,255,0.5)',
      }}
    >
      {children}
    </button>
  );
}
