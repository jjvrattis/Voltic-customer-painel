'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPedidos, SellerOrder, OrderStatus } from '../../../../lib/sellerApi';

const STATUS_LABELS: Record<string, string> = {
  pending:       'Pendente',
  ready_to_ship: 'Pronto p/ envio',
  collected:     'Coletado',
  shipped:       'Enviado',
  delivered:     'Entregue',
  cancelled:     'Cancelado',
};

const STATUS_DOT: Record<string, string> = {
  pending:       'bg-zinc-500',
  ready_to_ship: 'bg-blue-400',
  collected:     'bg-yellow-400',
  shipped:       'bg-purple-400',
  delivered:     'bg-[#00FF87]',
  cancelled:     'bg-red-400',
};

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',              label: 'Todos' },
  { value: 'ready_to_ship', label: 'Pronto' },
  { value: 'collected',     label: 'Coletado' },
  { value: 'shipped',       label: 'Enviado' },
  { value: 'delivered',     label: 'Entregue' },
  { value: 'cancelled',     label: 'Cancelado' },
];

function OrderCard({ order }: { order: SellerOrder }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">#{order.external_order_id}</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[order.status]}`} />
          <span className="text-zinc-300">{STATUS_LABELS[order.status]}</span>
        </span>
      </div>

      {order.tracking_number && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25" />
          </svg>
          <span className="font-mono truncate">{order.tracking_number}</span>
        </div>
      )}

      {order.pickup_address && (
        <p className="text-xs text-zinc-500 truncate">{order.pickup_address}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-zinc-600">
          {order.platform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}
        </span>
        <span className="text-[10px] text-zinc-600">
          {new Date(order.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

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

  // Polling a cada 20s
  useEffect(() => {
    setLoading(true);
    void load();
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  return (
    <div className="p-4 space-y-4">

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === opt.value
                ? 'bg-[#00FF87] text-black'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center text-zinc-600 py-12 text-sm">
          Nenhum pedido encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}

      {/* Paginação */}
      {total > 20 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-zinc-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      <p className="text-center text-xs text-zinc-700">{total} pedidos no total</p>
    </div>
  );
}
