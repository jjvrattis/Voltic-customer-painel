'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getOrders,
  Order,
  OrderFilters,
  OrderStatus,
  Platform,
} from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

const POLOS = ['Brás', '25 de Março', 'Santa Efigênia', 'Bom Retiro'];
const LIMIT = 15;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
        platform === 'mercadolivre'
          ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
          : 'bg-orange-400/10 text-orange-400 border-orange-400/20'
      }`}
    >
      {platform === 'mercadolivre' ? 'ML' : 'Shopee'}
    </span>
  );
}

function SelectField({
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
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [poloFilter, setPoloFilter] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: OrderFilters = {
        page,
        limit: LIMIT,
        ...(statusFilter && { status: statusFilter as OrderStatus }),
        ...(platformFilter && { platform: platformFilter as Platform }),
        ...(poloFilter && { polo: poloFilter }),
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

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // Resetar página ao mudar filtros
  useEffect(() => {
    setPage(1);
  }, [statusFilter, platformFilter, poloFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {total > 0 ? `${total} pedidos encontrados` : 'Nenhum pedido'}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ready_to_ship', label: 'Pronto p/ coletar' },
              { value: 'collected', label: 'Coletado' },
              { value: 'pending', label: 'Pendente' },
              { value: 'shipped', label: 'Enviado' },
              { value: 'delivered', label: 'Entregue' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
          />
          <SelectField
            label="Plataforma"
            value={platformFilter}
            onChange={setPlatformFilter}
            options={[
              { value: 'mercadolivre', label: 'Mercado Livre' },
              { value: 'shopee', label: 'Shopee' },
            ]}
          />
          <SelectField
            label="Polo"
            value={poloFilter}
            onChange={setPoloFilter}
            options={POLOS.map((p) => ({ value: p, label: p }))}
          />
        </div>
        {(statusFilter || platformFilter || poloFilter) && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                setStatusFilter('');
                setPlatformFilter('');
                setPoloFilter('');
              }}
              className="text-xs text-zinc-500 hover:text-brand transition-colors underline underline-offset-2"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500 mt-3">Carregando pedidos...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => void fetchOrders()}
              className="mt-3 text-xs text-brand hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  {[
                    'Plataforma',
                    'Pedido',
                    'Lojista',
                    'Tracking',
                    'Polo',
                    'Status',
                    'Horário',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <PlatformBadge platform={order.platform} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {order.external_order_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {order.seller_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {order.tracking_number ?? (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {order.polo ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
