import { getOrders, Order } from '@/lib/api';
import AdminMetricsStrip from '@/components/AdminMetricsStrip';

export const dynamic = 'force-dynamic';

const POLOS = ['Brás', '25 de Março', 'Santa Efigênia', 'Bom Retiro'] as const;

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── StatCard ──────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  variant?: 'default' | 'gold' | 'purple' | 'blue';
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, variant = 'default', icon }: StatCardProps) {
  const accentMap = {
    gold:    { color: '#FFD700', bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.2)',  glow: 'rgba(255,215,0,0.12)'  },
    purple:  { color: '#9333EA', bg: 'rgba(147,51,234,0.08)', border: 'rgba(147,51,234,0.25)', glow: 'rgba(147,51,234,0.1)' },
    blue:    { color: '#60A5FA', bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.2)',  glow: 'rgba(96,165,250,0.08)' },
    default: { color: '#D0D5DB', bg: 'rgba(255,255,255,0.04)', border: 'rgba(147,51,234,0.18)', glow: 'rgba(0,0,0,0.1)' },
  };
  const a = accentMap[variant];

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: a.bg,
        border: `1px solid ${a.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `0 4px 24px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.12em] font-body"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {title}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${a.color}15`, color: a.color }}
        >
          {icon}
        </div>
      </div>

      <div>
        <p
          className="text-4xl font-bold leading-none"
          style={{
            fontFamily: 'var(--font-rajdhani), system-ui',
            color: a.color,
            textShadow: variant !== 'default' ? `0 0 20px ${a.color}55` : 'none',
          }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-white/30 mt-1.5 font-body">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── PoloCard ──────────────────────────────────────────────────────────
function PoloCard({ polo, mlCount, shopeeCount }: { polo: string; mlCount: number; shopeeCount: number }) {
  const total = mlCount + shopeeCount;
  const pct = Math.min(100, (total / 20) * 100);

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(147,51,234,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3
            className="text-sm font-bold text-white leading-tight"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui', letterSpacing: '0.02em' }}
          >
            {polo}
          </h3>
          <p className="text-[10px] text-white/25 uppercase tracking-wider font-body mt-0.5">polo</p>
        </div>
        <span
          className="text-3xl font-bold leading-none"
          style={{
            fontFamily: 'var(--font-rajdhani), system-ui',
            color: total > 0 ? '#FFD700' : 'rgba(255,255,255,0.15)',
            textShadow: total > 0 ? '0 0 16px rgba(255,215,0,0.4)' : 'none',
          }}
        >
          {total}
        </span>
      </div>

      {/* Platform breakdown */}
      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
          <span className="text-[10px] text-white/40 font-body">ML <span className="text-white/60 font-semibold">{mlCount}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
          <span className="text-[10px] text-white/40 font-body">Shopee <span className="text-white/60 font-semibold">{shopeeCount}</span></span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: total > 0
              ? 'linear-gradient(90deg, #9333EA, #FFD700)'
              : 'transparent',
            boxShadow: total > 0 ? '0 0 8px rgba(255,215,0,0.4)' : 'none',
          }}
        />
      </div>
    </div>
  );
}

// ─── RecentRow ─────────────────────────────────────────────────────────
function RecentRow({ order }: { order: Order }) {
  const isML = order.platform === 'mercadolivre';
  return (
    <tr
      className="transition-colors duration-150"
      style={{ borderBottom: '1px solid rgba(147,51,234,0.08)' }}
    >
      <td className="px-5 py-3.5">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
          style={
            isML
              ? { background: 'rgba(234,179,8,0.12)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.2)' }
              : { background: 'rgba(249,115,22,0.1)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.2)' }
          }
        >
          {isML ? 'ML' : 'Shopee'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <code
          className="text-xs font-mono"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {order.external_order_id}
        </code>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {order.polo ?? '—'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <code className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {order.tracking_number ?? <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
        </code>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {formatHour(order.created_at)}
        </span>
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const today = new Date().toISOString().split('T')[0] as string;

  const [readyResult, collectedResult] = await Promise.all([
    getOrders({ status: 'ready_to_ship', limit: 500 }).catch(() => ({ items: [] as Order[], total: 0, page: 1, limit: 500 })),
    getOrders({ status: 'collected',      limit: 500 }).catch(() => ({ items: [] as Order[], total: 0, page: 1, limit: 500 })),
  ]);

  const readyOrders     = readyResult.items;
  const collectedOrders = collectedResult.items;
  const collectedToday  = collectedOrders.filter(o => o.collected_at?.startsWith(today)).length;
  const mlReady         = readyOrders.filter(o => o.platform === 'mercadolivre').length;
  const shopeeReady     = readyOrders.filter(o => o.platform === 'shopee').length;
  const poloStats       = POLOS.map(polo => ({
    polo,
    mlCount:    readyOrders.filter(o => o.polo === polo && o.platform === 'mercadolivre').length,
    shopeeCount: readyOrders.filter(o => o.polo === polo && o.platform === 'shopee').length,
  }));
  const recentReady = readyOrders.slice(0, 10);

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold font-body mb-1" style={{ color: 'rgba(255,215,0,0.6)' }}>
            ⚡ VOLTIC OPS
          </p>
          <h1
            className="text-4xl font-bold leading-none text-white"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui', letterSpacing: '0.02em' }}
          >
            Dashboard
          </h1>
          <p className="text-sm font-body mt-2 capitalize" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {dateLabel}
          </p>
        </div>

        {/* Live indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(147,51,234,0.2)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-[10px] tracking-wider uppercase font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Ao vivo
          </span>
        </div>
      </div>

      {/* ── Métricas globais (lojistas, coletores, entregas) ── */}
      <AdminMetricsStrip />

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Prontos p/ coletar"
          value={readyOrders.length}
          subtitle="Total geral"
          variant="gold"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />
        <StatCard
          title="Coletados hoje"
          value={collectedToday}
          subtitle={`de ${collectedOrders.length} total`}
          variant="purple"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Mercado Livre"
          value={mlReady}
          subtitle="prontos p/ coletar"
          variant="default"
          icon={
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8z"/>
            </svg>
          }
        />
        <StatCard
          title="Shopee"
          value={shopeeReady}
          subtitle="prontos p/ coletar"
          variant="blue"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.82m2.56-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Por polo ────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.18em] font-body"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Prontos por polo
          </h2>
          <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.12)' }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {poloStats.map(s => (
            <PoloCard key={s.polo} polo={s.polo} mlCount={s.mlCount} shopeeCount={s.shopeeCount} />
          ))}
        </div>
      </div>

      {/* ── Pedidos recentes ────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.18em] font-body"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Aguardando coleta
          </h2>
          <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.12)' }} />
          <span
            className="text-[10px] font-body"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {recentReady.length} registros
          </span>
        </div>

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
          {recentReady.length === 0 ? (
            <div className="py-16 text-center">
              <div
                className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.15)' }}
              >
                <svg className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5" />
                </svg>
              </div>
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Nenhum pedido aguardando coleta.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(147,51,234,0.12)' }}>
                  {['Plataforma', 'Pedido', 'Polo', 'Tracking', 'Horário'].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] font-body"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReady.map(order => (
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
