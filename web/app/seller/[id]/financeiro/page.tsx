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

function PixModal({
  charge,
  onClose,
}: {
  charge: SellerCharge;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!charge.pix_code) return;
    await navigator.clipboard.writeText(charge.pix_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-end sm:items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Pagar via Pix</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-[#00FF87]">{formatCurrency(charge.amount_cents)}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Expira em {formatDate(charge.expires_at)}
          </p>
        </div>

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
              className="w-48 h-48 rounded-xl bg-white p-2"
            />
          </div>
        )}

        {charge.pix_code && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 text-center">ou copie o código abaixo</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 break-all">
              {charge.pix_code}
            </div>
            <button
              onClick={() => void copy()}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                copied
                  ? 'bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40'
                  : 'bg-[#00FF87] text-black hover:bg-[#00e87a]'
              }`}
            >
              {copied ? 'Copiado!' : 'Copiar código Pix'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [data, setData]       = useState<FinanceiroData | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [modal, setModal]     = useState<SellerCharge | null>(null);

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
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const { credit, charges, pending_charge, amount_due: amountDue, ml_count, shopee_count } = data!;

  return (
    <>
      {modal && <PixModal charge={modal} onClose={() => setModal(null)} />}

      <div className="p-4 space-y-4">

        {/* Saldo */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Resumo do ciclo</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-xs text-zinc-500 mb-1">Valor a pagar</p>
              <p className={`text-2xl font-bold ${amountDue > 0 ? 'text-red-400' : 'text-[#00FF87]'}`}>
                {formatCurrency(amountDue)}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-xs text-zinc-500 mb-1">Total de pedidos</p>
              <p className="text-2xl font-bold text-white">{credit.used}</p>
            </div>
          </div>

          {(ml_count > 0 || shopee_count > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {ml_count > 0 && (
                <div className="bg-zinc-800/30 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-zinc-500">Mercado Livre</p>
                  <p className="text-sm font-semibold text-white">{ml_count} × {formatCurrency(1150)}</p>
                </div>
              )}
              {shopee_count > 0 && (
                <div className="bg-zinc-800/30 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-zinc-500">Shopee</p>
                  <p className="text-sm font-semibold text-white">{shopee_count} × {formatCurrency(800)}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-zinc-600 text-center">
            Ciclo: {new Date(credit.cycle_start + 'T00:00:00').toLocaleDateString('pt-BR')} →{' '}
            {new Date(credit.cycle_end + 'T00:00:00').toLocaleDateString('pt-BR')}
          </div>
        </section>

        {/* Botão de pagamento */}
        {amountDue > 0 && (
          <section>
            {pending_charge ? (
              <div className="space-y-3">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400 text-center">
                  Você tem um Pix pendente de {formatCurrency(pending_charge.amount_cents)}
                </div>
                <button
                  onClick={() => setModal(pending_charge)}
                  className="w-full py-3.5 rounded-xl bg-[#00FF87] text-black text-sm font-semibold hover:bg-[#00e87a] transition-colors"
                >
                  Ver QR Code / Pix
                </button>
              </div>
            ) : (
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="w-full py-3.5 rounded-xl bg-[#00FF87] text-black text-sm font-semibold hover:bg-[#00e87a] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                    Gerando Pix...
                  </>
                ) : (
                  `Pagar ${formatCurrency(amountDue)} via Pix`
                )}
              </button>
            )}
          </section>
        )}

        {amountDue === 0 && (
          <div className="bg-[#00FF87]/10 border border-[#00FF87]/20 rounded-xl p-4 text-center text-sm text-[#00FF87]">
            Tudo em dia! Nenhum valor pendente.
          </div>
        )}

        {/* Histórico */}
        {charges.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Histórico
            </h2>
            <div className="space-y-2">
              {charges.map((c) => (
                <div
                  key={c.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{formatCurrency(c.amount_cents)}</p>
                    <p className="text-xs text-zinc-500">{formatDate(c.created_at)}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === 'paid'
                        ? 'bg-[#00FF87]/10 text-[#00FF87]'
                        : c.status === 'pending'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {c.status === 'paid' ? 'Pago' : c.status === 'pending' ? 'Pendente' : 'Expirado'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
