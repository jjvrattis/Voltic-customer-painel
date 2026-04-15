'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface InviteInfo {
  seller_name: string;
  status: 'pending' | 'connected';
  expires_at: string;
}

function OnboardingContent() {
  const params = useParams<{ token: string }>();

  const [invite,     setInvite]     = useState<InviteInfo | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/onboarding/${params.token}`)
      .then(r => r.json())
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

  const bg = {
    background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(147,51,234,0.18) 0%, transparent 65%), #06040F',
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bg}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }} />
      </div>
    );
  }

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={bg}>
        <Image src="/logo.png" alt="Voltic" width={120} height={48} priority
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(147,51,234,0.35))', marginBottom: 32 }} />
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.2)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-1"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}>
            Link inválido
          </h1>
          <p className="text-sm font-body" style={{ color: '#FCA5A5' }}>{error}</p>
        </div>
      </div>
    );
  }

  // ── Já conectado ──────────────────────────────────────────────────────────
  if (invite?.status === 'connected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={bg}>
        <Image src="/logo.png" alt="Voltic" width={120} height={48} priority
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(147,51,234,0.35))', marginBottom: 32 }} />
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(34,197,94,0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#86EFAC" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}>
            Tudo pronto, {invite.seller_name.split(' ')[0]}!
          </h1>
          <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Mercado Livre conectado. Seus pedidos já estão sendo sincronizados.
          </p>
          <p className="text-xs font-body mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Pode fechar esta janela.
          </p>
        </div>
      </div>
    );
  }

  // ── Pendente — tela principal ─────────────────────────────────────────────
  const firstName = invite!.seller_name.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={bg}>
      <Image src="/logo.png" alt="Voltic" width={120} height={48} priority
        style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(147,51,234,0.35))', marginBottom: 32 }} />

      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-6"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(147,51,234,0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Saudação */}
        <div>
          <h1 className="text-2xl font-bold text-white"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}>
            Olá, {firstName}!
          </h1>
          <p className="text-xs mt-1 font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Conecte seu Mercado Livre para começar a operar.
          </p>
        </div>

        {/* Card ML */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            background: 'rgba(234,179,8,0.05)',
            border: '1px solid rgba(234,179,8,0.18)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.2)' }}>
              <span className="text-sm font-black" style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: '#FCD34D' }}>ML</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}>
                Mercado Livre
              </p>
              <p className="text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Sincronização automática · OAuth 2.0
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {[
              'Pedidos sincronizados a cada 10 minutos',
              'Token renovado automaticamente',
              'Autorização segura via OAuth 2.0',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-xs font-body"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#86EFAC" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Botão */}
        <button
          onClick={() => void handleConnect()}
          disabled={redirecting}
          className="w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            fontFamily: 'var(--font-rajdhani), system-ui',
            background: redirecting ? 'rgba(255,215,0,0.3)' : 'linear-gradient(135deg, #FFD700, #F59E0B)',
            color: '#0C0A1A',
            boxShadow: redirecting ? 'none' : '0 0 20px rgba(255,215,0,0.25)',
            cursor: redirecting ? 'not-allowed' : 'pointer',
          }}
        >
          {redirecting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0C0A1A' }} />
              Redirecionando...
            </>
          ) : (
            'Conectar Mercado Livre'
          )}
        </button>

        <p className="text-center text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Link válido até{' '}
          {new Date(invite!.expires_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#06040F' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }} />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
