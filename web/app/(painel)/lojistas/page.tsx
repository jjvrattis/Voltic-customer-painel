'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAdminSellers, updateSellerCredit,
  AdminSeller,
} from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function CreditModal({
  seller,
  onClose,
  onSaved,
}: {
  seller: AdminSeller;
  onClose: () => void;
  onSaved: () => void;
}) {
  const current = seller.credit?.credit_limit ?? 0;
  const [limit,  setLimit]  = useState(String(current));
  const [reset,  setReset]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    const parsed = parseInt(limit, 10);
    if (isNaN(parsed) || parsed < 0) { setError('Informe um limite válido'); return; }
    setSaving(true);
    setError('');
    try {
      await updateSellerCredit(seller.seller_id, { credit_limit: parsed, reset_cycle: reset || undefined });
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{
          background: 'rgba(12,10,26,0.97)',
          border: '1px solid rgba(147,51,234,0.25)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
              Editar crédito
            </h3>
            <p className="text-xs font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {seller.profile?.name ?? seller.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Situação atual */}
        {seller.credit && (
          <div
            className="rounded-2xl p-3 grid grid-cols-3 gap-2 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(147,51,234,0.15)' }}
          >
            {[
              { label: 'Limite', val: seller.credit.credit_limit, color: '#FFD700' },
              { label: 'Usado',  val: seller.credit.credit_used,  color: '#F87171' },
              { label: 'Livre',  val: seller.credit.credit_limit - seller.credit.credit_used, color: '#86EFAC' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color }}>{val}</p>
                <p className="text-[9px] font-body uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Input novo limite */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-body uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Novo limite
          </label>
          <input
            type="number"
            min={0}
            value={limit}
            onChange={e => setLimit(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-body text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(147,51,234,0.25)',
            }}
          />
        </div>

        {/* Resetar ciclo */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setReset(r => !r)}
            className="w-10 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer"
            style={{ background: reset ? '#9333EA' : 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ left: reset ? '22px' : '2px' }}
            />
          </div>
          <span className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Resetar ciclo (zera o usado e reinicia contador)
          </span>
        </label>

        {error && (
          <p className="text-xs font-body text-red-400">{error}</p>
        )}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
          style={{
            fontFamily: 'var(--font-rajdhani)',
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            color: '#06040F',
            boxShadow: '0 2px 16px rgba(255,215,0,0.25)',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

export default function LojistasPage() {
  const [sellers,  setSellers]  = useState<AdminSeller[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState<AdminSeller | null>(null);

  const load = useCallback(async () => {
    try {
      const { sellers: data } = await getAdminSellers();
      setSellers(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = sellers.filter(s => {
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.profile?.name ?? '').toLowerCase().includes(q) ||
      s.seller_id.includes(q)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {editing && (
        <CreditModal
          seller={editing}
          onClose={() => setEditing(null)}
          onSaved={() => void load()}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold font-body mb-1" style={{ color: 'rgba(255,215,0,0.6)' }}>
            ⚡ VOLTIC OPS
          </p>
          <h1 className="text-4xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.02em' }}>
            Lojistas
          </h1>
          <p className="text-sm font-body mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {sellers.length} lojista{sellers.length !== 1 ? 's' : ''} cadastrado{sellers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm font-body text-white outline-none w-72"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(147,51,234,0.2)',
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }} />
        </div>
      ) : error ? (
        <div className="rounded-2xl p-4 text-sm font-body" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
          {error}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(147,51,234,0.15)' }}>
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(147,51,234,0.12)' }}>
                {['Lojista', 'ID', 'Crédito', 'Usado', 'Ciclo', 'Pedidos', 'Última coleta', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] font-body" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Nenhum lojista encontrado
                  </td>
                </tr>
              ) : filtered.map(s => {
                const credit = s.credit;
                const pct    = credit ? Math.round((credit.credit_used / credit.credit_limit) * 100) : 0;
                const danger = pct >= 90;
                return (
                  <tr key={s.seller_id} style={{ borderBottom: '1px solid rgba(147,51,234,0.07)' }} className="hover:bg-white/[0.02] transition-colors">
                    {/* Lojista */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-white font-body">{s.profile?.name ?? '—'}</p>
                      <p className="text-[10px] font-body mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.email}</p>
                    </td>
                    {/* ID */}
                    <td className="px-5 py-3.5">
                      <code className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.seller_id}</code>
                    </td>
                    {/* Crédito */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: danger ? '#F87171' : '#FFD700' }}>
                          {credit?.credit_limit ?? '—'}
                        </span>
                        {credit && (
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                background: danger
                                  ? 'linear-gradient(90deg,#EF4444,#F97316)'
                                  : 'linear-gradient(90deg,#9333EA,#FFD700)',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Usado */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-body" style={{ color: danger ? '#F87171' : 'rgba(255,255,255,0.5)' }}>
                        {credit?.credit_used ?? '—'}
                        {credit && <span style={{ color: 'rgba(255,255,255,0.2)' }}> / {credit.credit_limit}</span>}
                      </span>
                    </td>
                    {/* Ciclo */}
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {credit ? `${formatDate(credit.cycle_start)} → ${formatDate(credit.cycle_end)}` : '—'}
                      </span>
                    </td>
                    {/* Pedidos */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-body text-white">{s.total_orders}</span>
                    </td>
                    {/* Última coleta */}
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {s.last_collection ? formatDate(s.last_collection) : '—'}
                      </span>
                    </td>
                    {/* Ações */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setEditing(s)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 font-body"
                        style={{
                          background: 'rgba(255,215,0,0.1)',
                          border: '1px solid rgba(255,215,0,0.25)',
                          color: '#FFD700',
                        }}
                      >
                        Editar crédito
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
