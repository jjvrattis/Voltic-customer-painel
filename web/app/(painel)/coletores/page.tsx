'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAdminCollectors, createAdminCollector, updateAdminCollector,
  AdminCollector,
} from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function CollectorModal({
  collector,
  onClose,
  onSaved,
}: {
  collector: AdminCollector | null; // null = novo
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !collector;
  const [name,   setName]   = useState(collector?.name ?? '');
  const [phone,  setPhone]  = useState(collector?.phone ?? '');
  const [pin,    setPin]    = useState('');
  const [zones,  setZones]  = useState((collector?.cep_zones ?? []).join(', '));
  const [active, setActive] = useState(collector?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    if (!name.trim() || !phone.trim()) { setError('Nome e telefone são obrigatórios'); return; }
    if (isNew && !/^\d{4}$/.test(pin)) { setError('PIN de 4 dígitos obrigatório para novo coletor'); return; }
    if (pin && !/^\d{4}$/.test(pin))   { setError('PIN deve ter exatamente 4 dígitos'); return; }
    const cep_zones = zones.split(',').map(z => z.trim()).filter(Boolean);
    setSaving(true); setError('');
    try {
      if (isNew) {
        await createAdminCollector({ name: name.trim(), phone: phone.trim(), pin, cep_zones });
      } else {
        const payload: Parameters<typeof updateAdminCollector>[1] = { name: name.trim(), phone: phone.trim(), active, cep_zones };
        if (pin) payload.pin = pin;
        await updateAdminCollector(collector!.id, payload);
      }
      onSaved(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { label: 'Nome completo', val: name, set: setName, full: true },
    { label: 'Telefone (somente números)', val: phone, set: setPhone },
    { label: isNew ? 'PIN (4 dígitos, obrigatório)' : 'PIN (deixe vazio para manter)', val: pin, set: setPin },
    { label: 'Zonas CEP (ex: 028, 011)', val: zones, set: setZones },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-3xl p-6 space-y-4" style={{ background: 'rgba(12,10,26,0.97)', border: '1px solid rgba(147,51,234,0.25)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
            {isNew ? 'Novo coletor' : `Editar — ${collector!.name}`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ label, val, set, full }) => (
            <div key={label} className={`space-y-1 ${full ? 'col-span-2' : ''}`}>
              <label className="text-[10px] font-body uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</label>
              <input
                type="text"
                value={val}
                onChange={e => (set as (v: string) => void)(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-body text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(147,51,234,0.25)' }}
              />
            </div>
          ))}
        </div>

        {!isNew && (
          <label className="flex items-center gap-3 cursor-pointer" onClick={() => setActive(a => !a)}>
            <div className="w-10 h-5 rounded-full transition-colors relative shrink-0" style={{ background: active ? '#22C55E' : 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: active ? '22px' : '2px' }} />
            </div>
            <span className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {active ? 'Coletor ativo' : 'Coletor inativo (sem acesso ao app)'}
            </span>
          </label>
        )}

        {error && <p className="text-xs font-body text-red-400">{error}</p>}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
          style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.05em', background: 'linear-gradient(135deg, #9333EA, #6D28D9)', color: '#fff', boxShadow: '0 2px 16px rgba(147,51,234,0.3)' }}
        >
          {saving ? 'Salvando...' : isNew ? 'Criar coletor' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

export default function ColetoresPage() {
  const [collectors, setCollectors] = useState<AdminCollector[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState('');
  const [editing,    setEditing]    = useState<AdminCollector | null>(null);
  const [creating,   setCreating]   = useState(false);

  const load = useCallback(async () => {
    try {
      const { collectors: data } = await getAdminCollectors();
      setCollectors(data); setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = collectors.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const closeModal = () => { setCreating(false); setEditing(null); };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {(creating || editing) && (
        <CollectorModal
          collector={creating ? null : editing}
          onClose={closeModal}
          onSaved={() => void load()}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold font-body mb-1" style={{ color: 'rgba(255,215,0,0.6)' }}>⚡ VOLTIC OPS</p>
          <h1 className="text-4xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-rajdhani)', letterSpacing: '0.02em' }}>Coletores</h1>
          <p className="text-sm font-body mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {collectors.filter(c => c.active).length} ativo{collectors.filter(c => c.active).length !== 1 ? 's' : ''} de {collectors.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm font-body text-white outline-none w-64"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.2)' }}
          />
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ fontFamily: 'var(--font-rajdhani)', background: 'linear-gradient(135deg, #9333EA, #6D28D9)', color: '#fff', boxShadow: '0 2px 12px rgba(147,51,234,0.3)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Novo coletor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,215,0,0.2)', borderTopColor: '#FFD700' }} />
        </div>
      ) : error ? (
        <div className="rounded-2xl p-4 text-sm font-body" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-sm font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum coletor encontrado</div>
          ) : filtered.map(c => (
            <div
              key={c.id}
              className="rounded-2xl p-5 space-y-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.active ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.06)'}`, opacity: c.active ? 1 : 0.55 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0" style={{ background: c.active ? 'rgba(147,51,234,0.15)' : 'rgba(255,255,255,0.05)', color: c.active ? '#C084FC' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-rajdhani)' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-body">{c.name}</p>
                    <p className="text-[11px] font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.phone}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold font-body px-2 py-1 rounded-full" style={c.active ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86EFAC' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
                  {c.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Scans',  val: String(c.total_scans), color: '#9333EA' },
                  { label: 'Zonas',  val: String(c.cep_zones.length), color: '#FFD700' },
                  { label: 'Desde',  val: formatDate(c.created_at), color: 'rgba(255,255,255,0.4)', small: true },
                ].map(({ label, val, color, small }) => (
                  <div key={label} className="text-center rounded-xl py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(147,51,234,0.1)' }}>
                    <p className={`font-bold leading-tight ${small ? 'text-[11px]' : 'text-lg'}`} style={{ fontFamily: small ? undefined : 'var(--font-rajdhani)', color }}>{val}</p>
                    <p className="text-[9px] font-body uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {c.cep_zones.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.cep_zones.map(z => (
                    <span key={z} className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.18)', color: 'rgba(255,215,0,0.7)' }}>{z}</span>
                  ))}
                </div>
              )}

              {c.last_delivery && (
                <p className="text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.2)' }}>Última entrega: {formatDate(c.last_delivery)}</p>
              )}

              <button
                onClick={() => setEditing(c)}
                className="w-full py-2 rounded-xl text-xs font-semibold font-body transition-all hover:opacity-90"
                style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.25)', color: '#C084FC' }}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
