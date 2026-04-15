'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMLAuthUrl, getShopeeAuthUrl, getConnectedSellers, SellerToken } from '@/lib/api';

// ─── Platform card ────────────────────────────────────────────────────
function PlatformCard({
  label,
  description,
  onConnect,
  loading,
  isML,
}: {
  label: string;
  description: string;
  onConnect: () => void;
  loading: boolean;
  isML: boolean;
}) {
  const color = isML ? '#FCD34D' : '#FB923C';
  const bg    = isML ? 'rgba(234,179,8,0.06)' : 'rgba(249,115,22,0.06)';
  const border = isML ? 'rgba(234,179,8,0.22)' : 'rgba(249,115,22,0.2)';
  const glow   = isML ? 'rgba(234,179,8,0.12)' : 'rgba(249,115,22,0.08)';

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `0 4px 32px ${glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}30`,
            boxShadow: `0 0 16px ${color}22`,
          }}
        >
          <span
            className="text-lg font-black"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui', color }}
          >
            {isML ? 'ML' : 'SHP'}
          </span>
        </div>
        <div>
          <h3
            className="font-bold text-white text-base"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui', letterSpacing: '0.03em' }}
          >
            {label}
          </h3>
          <p className="text-[11px] font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={onConnect}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          fontFamily: 'var(--font-rajdhani), system-ui',
          letterSpacing: '0.05em',
          background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`,
          border: `1px solid ${color}40`,
          color,
        }}
      >
        {loading ? (
          <>
            <span
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: `${color}40`, borderTopColor: color }}
            />
            Redirecionando...
          </>
        ) : (
          `Conectar ${label}`
        )}
      </button>
    </div>
  );
}

// ─── Seller row ───────────────────────────────────────────────────────
function SellerRow({ token }: { token: SellerToken }) {
  const isExpired  = new Date(token.expires_at) < new Date();
  const isML       = token.platform === 'mercadolivre';
  const expiresIn  = Math.round((new Date(token.expires_at).getTime() - Date.now()) / 1000 / 60 / 60);

  return (
    <tr
      className="transition-colors duration-150"
      style={{ borderBottom: '1px solid rgba(147,51,234,0.07)' }}
    >
      <td className="px-5 py-3.5">
        <code className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {token.seller_id}
        </code>
      </td>
      <td className="px-5 py-3.5">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
          style={
            isML
              ? { background: 'rgba(234,179,8,0.12)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.2)' }
              : { background: 'rgba(249,115,22,0.1)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.2)' }
          }
        >
          {isML ? 'Mercado Livre' : 'Shopee'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {isExpired ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-body"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Expirado
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-body"
            style={{ background: 'rgba(255,215,0,0.08)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Ativo · {expiresIn}h
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {new Date(token.expires_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </td>
    </tr>
  );
}

// ─── Success banner ───────────────────────────────────────────────────
function SuccessBanner() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const label = success === 'ml' ? 'Mercado Livre' : success === 'shopee' ? 'Shopee' : null;
  if (!label) return null;

  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-4"
      style={{
        background: 'rgba(255,215,0,0.06)',
        border: '1px solid rgba(255,215,0,0.25)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,215,0,0.15)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#FFD700" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm font-body" style={{ color: '#FFD700' }}>
        Lojista conectado ao <strong>{label}</strong> com sucesso!
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function ConectarPage() {
  const [mlLoading,     setMlLoading]     = useState(false);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [connectError,  setConnectError]  = useState<string | null>(null);

  const [sellers,       setSellers]       = useState<SellerToken[]>([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [sellersError,  setSellersError]  = useState<string | null>(null);

  useEffect(() => {
    getConnectedSellers()
      .then(setSellers)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar lojistas';
        setSellersError(msg);
      })
      .finally(() => setSellersLoading(false));
  }, []);

  async function handleConnectML() {
    setMlLoading(true); setConnectError(null);
    try { window.location.href = await getMLAuthUrl(); }
    catch (err) { setConnectError(err instanceof Error ? err.message : 'Erro ao gerar URL do ML'); setMlLoading(false); }
  }

  async function handleConnectShopee() {
    setShopeeLoading(true); setConnectError(null);
    try { window.location.href = await getShopeeAuthUrl(); }
    catch (err) { setConnectError(err instanceof Error ? err.message : 'Erro ao gerar URL da Shopee'); setShopeeLoading(false); }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold font-body mb-1" style={{ color: 'rgba(255,215,0,0.6)' }}>
          ⚡ VOLTIC OPS
        </p>
        <h1
          className="text-4xl font-bold leading-none text-white"
          style={{ fontFamily: 'var(--font-rajdhani), system-ui', letterSpacing: '0.02em' }}
        >
          Conectar Lojistas
        </h1>
        <p className="text-sm font-body mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Autorize o acesso às plataformas para sincronizar pedidos automaticamente.
        </p>
      </div>

      {/* Success / Error banners */}
      <Suspense fallback={null}>
        <SuccessBanner />
      </Suspense>

      {connectError && (
        <div
          className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-body" style={{ color: '#F87171' }}>{connectError}</p>
        </div>
      )}

      {/* ── Platform cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <PlatformCard
          label="Mercado Livre"
          description="OAuth 2.0 · pedidos ready_to_ship"
          isML={true}
          onConnect={() => void handleConnectML()}
          loading={mlLoading}
        />
        <PlatformCard
          label="Shopee"
          description="HMAC-SHA256 · pedidos READY_TO_SHIP"
          isML={false}
          onConnect={() => void handleConnectShopee()}
          loading={shopeeLoading}
        />
      </div>

      {/* ── Connected sellers ────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.18em] font-body"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Lojistas conectados
          </h2>
          <div className="flex-1 h-px" style={{ background: 'rgba(147,51,234,0.12)' }} />
          {sellers.length > 0 && (
            <span className="text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {sellers.length} {sellers.length === 1 ? 'lojista' : 'lojistas'}
            </span>
          )}
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
          {sellersLoading ? (
            <div className="py-14 text-center">
              <div
                className="inline-block w-7 h-7 rounded-full border-2 animate-spin mb-4"
                style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }}
              />
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>Carregando...</p>
            </div>
          ) : sellersError ? (
            <div className="py-12 text-center px-6">
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Endpoint{' '}
                <code
                  className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  GET /api/v1/sellers
                </code>{' '}
                ainda não implementado.
              </p>
              <p className="text-xs font-body mt-1.5" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Os tokens estão salvos no Supabase (tabela{' '}
                <code className="font-mono">seller_tokens</code>).
              </p>
            </div>
          ) : sellers.length === 0 ? (
            <div className="py-14 text-center">
              <div
                className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.15)' }}
              >
                <svg className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Nenhum lojista conectado ainda.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(147,51,234,0.12)' }}>
                  {['Seller ID', 'Plataforma', 'Status', 'Expira em'].map(h => (
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
                {sellers.map(t => <SellerRow key={t.id} token={t} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
