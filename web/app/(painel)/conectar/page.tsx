'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getMLAuthUrl,
  getShopeeAuthUrl,
  getConnectedSellers,
  SellerToken,
} from '@/lib/api';

function ConnectButton({
  label,
  description,
  color,
  logo,
  onConnect,
  loading,
}: {
  label: string;
  description: string;
  color: string;
  logo: React.ReactNode;
  onConnect: () => void;
  loading: boolean;
}) {
  return (
    <div className={`rounded-xl border ${color} p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-3">
        {logo}
        <div>
          <h3 className="font-semibold text-white">{label}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onConnect}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            Redirecionando...
          </>
        ) : (
          `Conectar ${label}`
        )}
      </button>
    </div>
  );
}

function SellerRow({ token }: { token: SellerToken }) {
  const isExpired = new Date(token.expires_at) < new Date();
  const expiresIn = Math.round(
    (new Date(token.expires_at).getTime() - Date.now()) / 1000 / 60 / 60,
  );

  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors">
      <td className="px-4 py-3 text-sm font-mono text-zinc-300">
        {token.seller_id}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
            token.platform === 'mercadolivre'
              ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
              : 'bg-orange-400/10 text-orange-400 border-orange-400/20'
          }`}
        >
          {token.platform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}
        </span>
      </td>
      <td className="px-4 py-3">
        {isExpired ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
            Expirado
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-brand/10 text-brand border-brand/20">
            Ativo · {expiresIn}h restantes
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500">
        {new Date(token.expires_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
    </tr>
  );
}

function SuccessBanner() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const platformLabel =
    success === 'ml' ? 'Mercado Livre' : success === 'shopee' ? 'Shopee' : null;

  if (!platformLabel) return null;
  return (
    <div className="mb-6 flex items-center gap-3 bg-brand/10 border border-brand/30 text-brand rounded-xl px-5 py-4">
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm font-medium">
        Lojista conectado ao {platformLabel} com sucesso!
      </p>
    </div>
  );
}

export default function ConectarPage() {
  const [mlLoading, setMlLoading]     = useState(false);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [connectError, setConnectError]   = useState<string | null>(null);

  const [sellers, setSellers] = useState<SellerToken[]>([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [sellersError, setSellersError] = useState<string | null>(null);

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
    setMlLoading(true);
    setConnectError(null);
    try {
      const url = await getMLAuthUrl();
      window.location.href = url;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Erro ao gerar URL do ML');
      setMlLoading(false);
    }
  }

  async function handleConnectShopee() {
    setShopeeLoading(true);
    setConnectError(null);
    try {
      const url = await getShopeeAuthUrl();
      window.location.href = url;
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : 'Erro ao gerar URL da Shopee',
      );
      setShopeeLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Conectar Lojistas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Autorize o acesso às plataformas para sincronizar pedidos automaticamente.
        </p>
      </div>

      {/* Banner de sucesso — Suspense necessário por useSearchParams */}
      <Suspense fallback={null}>
        <SuccessBanner />
      </Suspense>

      {/* Banner de erro */}
      {connectError && (
        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-5 py-4">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm">{connectError}</p>
        </div>
      )}

      {/* Botões de conexão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <ConnectButton
          label="Mercado Livre"
          description="OAuth 2.0 · pedidos ready_to_ship"
          color="border-yellow-400/20 bg-yellow-400/5"
          logo={
            <div className="w-10 h-10 rounded-lg bg-yellow-400/20 flex items-center justify-center shrink-0">
              <span className="text-yellow-400 font-black text-lg">ML</span>
            </div>
          }
          onConnect={() => void handleConnectML()}
          loading={mlLoading}
        />
        <ConnectButton
          label="Shopee"
          description="HMAC-SHA256 · pedidos READY_TO_SHIP"
          color="border-orange-400/20 bg-orange-400/5"
          logo={
            <div className="w-10 h-10 rounded-lg bg-orange-400/20 flex items-center justify-center shrink-0">
              <span className="text-orange-400 font-black text-sm">SHP</span>
            </div>
          }
          onConnect={() => void handleConnectShopee()}
          loading={shopeeLoading}
        />
      </div>

      {/* Lista de lojistas conectados */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Lojistas conectados
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {sellersLoading ? (
            <div className="py-10 text-center">
              <div className="inline-block w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 mt-2">Carregando...</p>
            </div>
          ) : sellersError ? (
            <div className="py-10 text-center px-4">
              <p className="text-sm text-zinc-500">
                Endpoint{' '}
                <code className="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                  GET /api/v1/sellers
                </code>{' '}
                ainda não implementado no backend.
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Os tokens já conectados estão salvos no Supabase (tabela{' '}
                <code className="font-mono">seller_tokens</code>).
              </p>
            </div>
          ) : sellers.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              Nenhum lojista conectado ainda.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Seller ID', 'Plataforma', 'Status', 'Expira em'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sellers.map((t) => (
                  <SellerRow key={t.id} token={t} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
