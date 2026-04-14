'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface InviteInfo {
  seller_name: string;
  status: 'pending' | 'connected';
  expires_at: string;
}

function OnboardingContent() {
  const params      = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const connected   = searchParams.get('connected') === 'true';

  const [invite, setInvite]   = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/onboarding/${params.token}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error ?? 'Link inválido');
        setInvite(json.data as InviteInfo);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleConnect() {
    setRedirecting(true);
    try {
      const res  = await fetch(`${API_BASE}/api/v1/auth/ml/url?state=${params.token}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      window.location.href = json.data.url as string;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao conectar');
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white mb-1">Link inválido</h1>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  // ── Já conectado ──────────────────────────────────────────────────────────
  if (connected || invite?.status === 'connected') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Tudo pronto, {invite?.seller_name?.split(' ')[0]}! 🎉
          </h1>
          <p className="text-sm text-zinc-400">
            Seu Mercado Livre foi conectado com sucesso. Seus pedidos já estão sendo sincronizados automaticamente.
          </p>
          <p className="text-xs text-zinc-600 mt-4">
            Pode fechar esta janela.
          </p>
        </div>
      </div>
    );
  }

  // ── Pendente — tela principal de onboarding ───────────────────────────────
  const firstName = invite!.seller_name.split(' ')[0];

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-sm w-full">
        {/* Logo / marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
              <span className="text-zinc-900 font-black text-sm">V</span>
            </div>
            <span className="text-white font-semibold text-lg">Voltic</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-sm text-zinc-400">
            Conecte seu Mercado Livre para sincronizar seus pedidos automaticamente.
          </p>
        </div>

        {/* Card de conexão */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
              <span className="text-yellow-400 font-black text-sm">ML</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mercado Livre</p>
              <p className="text-xs text-zinc-500">Sincronização automática de pedidos</p>
            </div>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              'Pedidos sincronizados a cada 10 minutos',
              'Token renovado automaticamente',
              'Autorização segura via OAuth 2.0',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          <button
            onClick={() => void handleConnect()}
            disabled={redirecting}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {redirecting ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
                Redirecionando para o ML...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Conectar Mercado Livre
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Este link expira em{' '}
          {new Date(invite!.expires_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
