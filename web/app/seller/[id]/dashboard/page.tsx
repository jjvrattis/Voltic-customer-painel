'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDashboard, DashboardData } from '../../../../lib/sellerApi';

const STATUS_LABELS: Record<string, string> = {
  ready_to_ship: 'Pronto p/ envio',
  collected:     'Coletado',
  shipped:       'Enviado',
  delivered:     'Entregue',
  cancelled:     'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  ready_to_ship: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  collected:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  shipped:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered:     'bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/20',
  cancelled:     'bg-red-500/10 text-red-400 border-red-500/20',
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DashboardPage() {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [error, setError]   = useState<string | null>(null);
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
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const { orders_today, credit } = data!;

  const statuses = ['ready_to_ship', 'collected', 'shipped', 'delivered', 'cancelled'] as const;

  return (
    <div className="p-4 space-y-4">

      {/* Hoje */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Hoje</h2>
          <span className="text-xs text-zinc-600">{orders_today.total} pedidos</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <div
              key={s}
              className={`rounded-xl border p-3 flex flex-col gap-1 ${STATUS_COLORS[s]}`}
            >
              <span className="text-2xl font-bold">{orders_today[s]}</span>
              <span className="text-xs opacity-80">{STATUS_LABELS[s]}</span>
            </div>
          ))}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex flex-col gap-1">
            <span className="text-2xl font-bold text-white">{orders_today.total}</span>
            <span className="text-xs text-zinc-500">Total</span>
          </div>
        </div>
      </section>

      {/* Crédito */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Crédito do ciclo
        </h2>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
          {/* Barra de progresso */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-zinc-400">Utilizado</span>
              <span className={credit.low_credit ? 'text-red-400' : 'text-[#00FF87]'}>
                {credit.pct_remaining}% restante
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  credit.low_credit ? 'bg-red-500' : 'bg-[#00FF87]'
                }`}
                style={{ width: `${Math.max(2, credit.pct_remaining)}%` }}
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-white">{credit.limit}</p>
              <p className="text-xs text-zinc-500">Limite</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{credit.used}</p>
              <p className="text-xs text-zinc-500">Usados</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${credit.low_credit ? 'text-red-400' : 'text-[#00FF87]'}`}>
                {credit.remaining}
              </p>
              <p className="text-xs text-zinc-500">Restam</p>
            </div>
          </div>

          {/* Ciclo */}
          <div className="text-center text-xs text-zinc-600 border-t border-zinc-800 pt-3">
            Ciclo: {new Date(credit.cycle_start + 'T00:00:00').toLocaleDateString('pt-BR')} →{' '}
            {new Date(credit.cycle_end + 'T00:00:00').toLocaleDateString('pt-BR')}
          </div>

          {credit.low_credit && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 text-center">
              Crédito baixo — acesse <strong>Financeiro</strong> para regularizar
            </div>
          )}
        </div>
      </section>

      {/* Valor por pedido */}
      <p className="text-center text-xs text-zinc-600">
        Custo por pedido: {formatCurrency(Number(process.env.NEXT_PUBLIC_PRICE_PER_ORDER_CENTS ?? 150))}
      </p>
    </div>
  );
}
