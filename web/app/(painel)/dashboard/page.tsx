import { getOrders, Order } from '@/lib/api';

export const dynamic = 'force-dynamic';

const POLOS = ['Brás', '25 de Março', 'Santa Efigênia', 'Bom Retiro'] as const;

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Componentes de apresentação ─────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  accent = false,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-1 ${
        accent
          ? 'bg-brand/5 border-brand/30'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {title}
      </p>
      <p
        className={`text-3xl font-bold ${accent ? 'text-brand' : 'text-white'}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

function PoloCard({
  polo,
  mlCount,
  shopeeCount,
}: {
  polo: string;
  mlCount: number;
  shopeeCount: number;
}) {
  const total = mlCount + shopeeCount;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{polo}</h3>
        <span
          className={`text-2xl font-bold ${
            total > 0 ? 'text-brand' : 'text-zinc-600'
          }`}
        >
          {total}
        </span>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          ML: {mlCount}
        </span>
        <span className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          Shopee: {shopeeCount}
        </span>
      </div>
      {total > 0 && (
        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${Math.min(100, (total / 20) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function RecentRow({ order }: { order: Order }) {
  const platformLabel =
    order.platform === 'mercadolivre' ? 'ML' : 'Shopee';
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors">
      <td className="px-4 py-3 text-xs">
        <span
          className={`px-2 py-0.5 rounded border text-xs font-medium ${
            order.platform === 'mercadolivre'
              ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
              : 'bg-orange-400/10 text-orange-400 border-orange-400/20'
          }`}
        >
          {platformLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-300 font-mono">
        {order.external_order_id}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {order.polo ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {order.tracking_number ?? '—'}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500">
        {formatHour(order.created_at)}
      </td>
    </tr>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const today = new Date().toISOString().split('T')[0] as string;

  const [readyResult, collectedResult] = await Promise.all([
    getOrders({ status: 'ready_to_ship', limit: 500 }).catch(() => ({
      items: [] as Order[],
      total: 0,
      page: 1,
      limit: 500,
    })),
    getOrders({ status: 'collected', limit: 500 }).catch(() => ({
      items: [] as Order[],
      total: 0,
      page: 1,
      limit: 500,
    })),
  ]);

  const readyOrders = readyResult.items;
  const collectedOrders = collectedResult.items;

  const collectedToday = collectedOrders.filter(
    (o) => o.collected_at && o.collected_at.startsWith(today),
  ).length;

  const mlReady = readyOrders.filter((o) => o.platform === 'mercadolivre').length;
  const shopeeReady = readyOrders.filter((o) => o.platform === 'shopee').length;

  const poloStats = POLOS.map((polo) => ({
    polo,
    mlCount: readyOrders.filter(
      (o) => o.polo === polo && o.platform === 'mercadolivre',
    ).length,
    shopeeCount: readyOrders.filter(
      (o) => o.polo === polo && o.platform === 'shopee',
    ).length,
  }));

  const recentReady = readyOrders.slice(0, 8);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Prontos p/ coletar"
          value={readyOrders.length}
          subtitle="Total geral"
          accent
        />
        <StatCard
          title="Coletados hoje"
          value={collectedToday}
          subtitle={`de ${collectedOrders.length} total`}
        />
        <StatCard
          title="Mercado Livre"
          value={mlReady}
          subtitle="prontos p/ coletar"
        />
        <StatCard
          title="Shopee"
          value={shopeeReady}
          subtitle="prontos p/ coletar"
        />
      </div>

      {/* Por polo */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Prontos por polo
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {poloStats.map((s) => (
            <PoloCard
              key={s.polo}
              polo={s.polo}
              mlCount={s.mlCount}
              shopeeCount={s.shopeeCount}
            />
          ))}
        </div>
      </div>

      {/* Pedidos recentes */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Pedidos aguardando coleta
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {recentReady.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Nenhum pedido aguardando coleta.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Plataforma', 'Pedido', 'Polo', 'Tracking', 'Horário'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {recentReady.map((order) => (
                  <RecentRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
