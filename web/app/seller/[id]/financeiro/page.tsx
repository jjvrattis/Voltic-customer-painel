'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFinanceiro, createCharge, FinanceiroData, SellerCharge } from '../../../../lib/sellerApi';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Pix Modal ────────────────────────────────────────────────────────
function PixModal({ charge, onClose }: { charge: SellerCharge; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!charge.pix_code) return;
    await navigator.clipboard.writeText(charge.pix_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 space-y-5 animate-slide-up"
        style={{
          background: 'rgba(12,10,26,0.95)',
          border: '1px solid rgba(147,51,234,0.25)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M13 2L4.5 13.5H11L10 22L20.5 10.5H14L13 2Z" fill="#FFD700" />
              </svg>
            </div>
            <h3
              className="font-bold text-white"
              style={{ fontFamily: 'var(--font-rajdhani), system-ui', letterSpacing: '0.03em' }}
            >
              Pagar via Pix
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Amount */}
        <div
          className="text-center py-4 rounded-2xl"
          style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}
        >
          <p
            className="text-4xl font-bold"
            style={{
              fontFamily: 'var(--font-rajdhani), system-ui',
              color: '#FFD700',
              textShadow: '0 0 24px rgba(255,215,0,0.4)',
            }}
          >
            {formatCurrency(charge.amount_cents)}
          </p>
          <p className="text-xs font-body mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Expira em {formatDate(charge.expires_at)}
          </p>
        </div>

        {/* QR Code */}
        {charge.qr_code_base64 && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                charge.qr_code_base64.startsWith('data:') || charge.qr_code_base64.startsWith('http')
                  ? charge.qr_code_base64
                  : `data:image/png;base64,${charge.qr_code_base64}`
              }
              alt="QR Code Pix"
              className="w-48 h-48 rounded-2xl bg-white p-2.5"
            />
          </div>
        )}

        {/* Pix code */}
        {charge.pix_code && (
          <div className="space-y-2.5">
            <p className="text-xs font-body text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
              ou copie o código abaixo
            </p>
            <div
              className="rounded-xl p-3 text-xs font-mono break-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              {charge.pix_code}
            </div>
            <button
              onClick={() => void copy()}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                fontFamily: 'var(--font-rajdhani), system-ui',
                letterSpacing: '0.05em',
                background: copied
                  ? 'rgba(34,197,94,0.12)'
                  : 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
                border: copied ? '1px solid rgba(34,197,94,0.3)' : 'none',
                color: copied ? '#86EFAC' : '#06040F',
                boxShadow: copied ? 'none' : '0 2px 16px rgba(255,215,0,0.25)',
              }}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copiar código Pix
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [data,       setData]       = useState<FinanceiroData | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [modal,      setModal]      = useState<SellerCharge | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getFinanceiro();
      setData(d);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const charge = await createCharge();
      setModal(charge);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar cobrança');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }}
        />
        <p className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>Carregando...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4">
        <div
          className="rounded-2xl p-4 text-sm font-body"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}
        >
          {error}
        </div>
      </div>
    );
  }

  const { credit, charges, pending_charge, amount_due: amountDue, ml_count, shopee_count } = data!;
  const hasDue = amountDue > 0;

  return (
    <>
      {modal && <PixModal charge={modal} onClose={() => setModal(null)} />}

      <div className="p-4 space-y-4 animate-fade-in">

        {/* ── Resumo do ciclo ─────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-1 h-4 rounded-full"
              style={{ background: hasDue ? 'linear-gradient(180deg, #EF4444, #F97316)' : 'linear-gradient(180deg, #9333EA, #FFD700)' }}
            />
            <h2
              className="text-sm font-bold tracking-wide"
              style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: 'rgba(255,255,255,0.7)' }}
            >
              Resumo do ciclo
            </h2>
          </div>

          <div
            className="rounded-2xl p-4 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(147,51,234,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Main values */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: hasDue ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.06)',
                  border: hasDue ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.15)',
                }}
              >
                <p className="text-[10px] font-body mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Valor a pagar
                </p>
                <p
                  className="text-2xl font-bold leading-tight"
                  style={{
                    fontFamily: 'var(--font-rajdhani), system-ui',
                    color: hasDue ? '#F87171' : '#86EFAC',
                  }}
                >
                  {formatCurrency(amountDue)}
                </p>
              </div>

              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] font-body mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Total pedidos
                </p>
                <p
                  className="text-2xl font-bold leading-tight text-white"
                  style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}
                >
                  {credit.used}
                </p>
              </div>
            </div>

            {/* Platform breakdown */}
            {(ml_count > 0 || shopee_count > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {ml_count > 0 && (
                  <div
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: 'rgba(252,211,77,0.05)', border: '1px solid rgba(252,211,77,0.12)' }}
                  >
                    <p className="text-[9px] font-body uppercase tracking-wider mb-0.5" style={{ color: 'rgba(252,211,77,0.5)' }}>
                      Mercado Livre
                    </p>
                    <p className="text-sm font-semibold text-white font-body">
                      {ml_count} × {formatCurrency(1150)}
                    </p>
                  </div>
                )}
                {shopee_count > 0 && (
                  <div
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.12)' }}
                  >
                    <p className="text-[9px] font-body uppercase tracking-wider mb-0.5" style={{ color: 'rgba(251,146,60,0.5)' }}>
                      Shopee
                    </p>
                    <p className="text-sm font-semibold text-white font-body">
                      {shopee_count} × {formatCurrency(800)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cycle dates */}
            <p className="text-center text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.18)' }}>
              {new Date(credit.cycle_start + 'T00:00:00').toLocaleDateString('pt-BR')}
              {' → '}
              {new Date(credit.cycle_end + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </section>

        {/* ── CTA pagamento ───────────────────────── */}
        {hasDue ? (
          <section>
            {pending_charge ? (
              <div className="space-y-3">
                <div
                  className="rounded-xl p-3 text-xs text-center font-body"
                  style={{
                    background: 'rgba(234,179,8,0.08)',
                    border: '1px solid rgba(234,179,8,0.2)',
                    color: '#FCD34D',
                  }}
                >
                  Você tem um Pix pendente de{' '}
                  <strong>{formatCurrency(pending_charge.amount_cents)}</strong>
                </div>
                <button
                  onClick={() => setModal(pending_charge)}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    fontFamily: 'var(--font-rajdhani), system-ui',
                    letterSpacing: '0.05em',
                    background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
                    color: '#06040F',
                    boxShadow: '0 4px 24px rgba(255,215,0,0.3)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                  </svg>
                  Ver QR Code / Pix
                </button>
              </div>
            ) : (
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'var(--font-rajdhani), system-ui',
                  letterSpacing: '0.05em',
                  background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
                  color: '#06040F',
                  boxShadow: '0 4px 24px rgba(255,215,0,0.3)',
                }}
              >
                {generating ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
                      style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#06040F' }}
                    />
                    Gerando Pix...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0">
                      <path d="M13 2L4.5 13.5H11L10 22L20.5 10.5H14L13 2Z" fill="currentColor" />
                    </svg>
                    Pagar {formatCurrency(amountDue)} via Pix
                  </>
                )}
              </button>
            )}
          </section>
        ) : (
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: 'rgba(34,197,94,0.07)',
              border: '1px solid rgba(34,197,94,0.18)',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#86EFAC" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span
                className="text-sm font-bold"
                style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: '#86EFAC' }}
              >
                Tudo em dia!
              </span>
            </div>
            <p className="text-xs font-body" style={{ color: 'rgba(134,239,172,0.5)' }}>
              Nenhum valor pendente neste ciclo.
            </p>
          </div>
        )}

        {/* ── Histórico ───────────────────────────── */}
        {charges.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1 h-4 rounded-full"
                style={{ background: 'linear-gradient(180deg, rgba(147,51,234,0.5), rgba(255,215,0,0.3))' }}
              />
              <h2
                className="text-sm font-bold tracking-wide"
                style={{ fontFamily: 'var(--font-rajdhani), system-ui', color: 'rgba(255,255,255,0.7)' }}
              >
                Histórico
              </h2>
            </div>

            <div className="space-y-2">
              {charges.map(c => {
                const isPaid    = c.status === 'paid';
                const isPending = c.status === 'pending';
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl p-3.5 flex items-center justify-between"
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(147,51,234,0.12)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <div>
                      <p
                        className="text-base font-bold text-white"
                        style={{ fontFamily: 'var(--font-rajdhani), system-ui' }}
                      >
                        {formatCurrency(c.amount_cents)}
                      </p>
                      <p className="text-[10px] font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold font-body"
                      style={
                        isPaid
                          ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', color: '#86EFAC' }
                          : isPending
                          ? { background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',  color: '#FCD34D' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: isPaid ? '#22C55E' : isPending ? '#EAB308' : 'rgba(255,255,255,0.2)',
                        }}
                      />
                      {isPaid ? 'Pago' : isPending ? 'Pendente' : 'Expirado'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
