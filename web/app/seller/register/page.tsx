'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { registerSeller, saveSellerToken, saveSellerId } from '../../../lib/sellerApi';

function RegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const inviteToken  = searchParams.get('invite') ?? '';

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) setError('Link de convite inválido. Solicite um novo convite ao administrador.');
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    if (!inviteToken) return;
    setLoading(true);
    setError(null);
    try {
      const { token, seller_id } = await registerSeller(inviteToken, email, password);
      saveSellerToken(token);
      saveSellerId(seller_id);
      router.replace(`/seller/${seller_id}/dashboard`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(147,51,234,0.18) 0%, transparent 65%), #06040F',
      }}
    >
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="Voltic"
          width={130}
          height={52}
          priority
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(147,51,234,0.35))' }}
        />
      </div>

      {/* Card */}
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
        <div>
          <h1
            className="text-2xl font-bold tracking-wide"
            style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: '#fff' }}
          >
            Criar conta
          </h1>
          <p className="text-xs mt-1 font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Configure seu acesso ao painel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              className="text-[11px] font-semibold uppercase tracking-widest font-body"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full rounded-xl px-4 py-3 text-sm font-body outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(147,51,234,0.2)',
                color: '#fff',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(147,51,234,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(147,51,234,0.2)')}
            />
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <label
              className="text-[11px] font-semibold uppercase tracking-widest font-body"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-xl px-4 py-3 text-sm font-body outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(147,51,234,0.2)',
                color: '#fff',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(147,51,234,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(147,51,234,0.2)')}
            />
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-1.5">
            <label
              className="text-[11px] font-semibold uppercase tracking-widest font-body"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm font-body outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(147,51,234,0.2)',
                color: '#fff',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(147,51,234,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(147,51,234,0.2)')}
            />
          </div>

          {/* Erro */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-xs font-body"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#FCA5A5',
              }}
            >
              {error}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || !inviteToken}
            className="w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-all duration-200"
            style={{
              fontFamily: 'var(--font-rajdhani), system-ui',
              background: (loading || !inviteToken)
                ? 'rgba(255,215,0,0.3)'
                : 'linear-gradient(135deg, #FFD700, #F59E0B)',
              color: '#0C0A1A',
              boxShadow: (loading || !inviteToken) ? 'none' : '0 0 20px rgba(255,215,0,0.25)',
              cursor: (loading || !inviteToken) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-xs font-body" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Já tem conta?{' '}
          <a
            href="/login"
            className="transition-colors"
            style={{ color: '#9333EA' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9333EA')}
          >
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06040F' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }} />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
