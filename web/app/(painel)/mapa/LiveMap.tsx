'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAdminToken } from '@/lib/api';

interface Pin {
  collector_id: string;
  lat:          number;
  lng:          number;
  heading:      number | null;
  speed:        number | null;
  name:         string;
  packages:     number;
  updated_at:   string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function fetchPins(): Promise<Pin[]> {
  const token = getAdminToken();
  if (!token) return [];
  try {
    const res  = await fetch(`${API_BASE}/api/v1/admin/map`, {
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    });
    const json = await res.json() as { success: boolean; data?: { pins: Pin[] } };
    return json.success ? (json.data?.pins ?? []) : [];
  } catch {
    return [];
  }
}

// Ícone customizado para o entregador
function makeIcon(name: string, packages: number) {
  const initial = name.charAt(0).toUpperCase();
  const html = `
    <div style="
      position: relative;
      display: flex; flex-direction: column; align-items: center;
    ">
      <div style="
        width: 44px; height: 44px; border-radius: 50%;
        background: linear-gradient(135deg, #9333EA, #FFD700);
        border: 3px solid #FFD700;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 800; color: #06040F;
        box-shadow: 0 0 16px rgba(255,215,0,0.5);
        font-family: system-ui, sans-serif;
      ">${initial}</div>
      ${packages > 0 ? `
        <div style="
          position: absolute; top: -4px; right: -6px;
          background: #EF4444; color: #fff;
          border-radius: 10px; padding: 1px 5px;
          font-size: 10px; font-weight: 700;
          font-family: system-ui, sans-serif;
          border: 2px solid #06040F;
        ">${packages}</div>
      ` : ''}
      <div style="
        margin-top: 3px;
        background: rgba(6,4,15,0.85);
        border: 1px solid rgba(147,51,234,0.4);
        border-radius: 8px; padding: 2px 7px;
        font-size: 10px; color: #fff;
        font-family: system-ui, sans-serif;
        white-space: nowrap;
        backdrop-filter: blur(4px);
      ">${name.split(' ')[0]}</div>
    </div>
  `;
  return L.divIcon({ html, className: '', iconSize: [44, 60], iconAnchor: [22, 22] });
}

export default function LiveMap() {
  const mapRef      = useRef<L.Map | null>(null);
  const markersRef  = useRef<Map<string, L.Marker>>(new Map());
  const containerRef= useRef<HTMLDivElement>(null);
  const [pins,      setPins]      = useState<Pin[]>([]);
  const [lastUpdate,setLastUpdate]= useState<string>('—');
  const [count,     setCount]     = useState(0);

  // Inicializa o mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-23.55, -46.63],  // São Paulo
      zoom:   12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Estilo escuro via CSS filter
    const tiles = document.querySelector('.leaflet-tile-pane') as HTMLElement | null;
    if (tiles) {
      tiles.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)';
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Polling a cada 10s
  useEffect(() => {
    const poll = async () => {
      const data = await fetchPins();
      setPins(data);
      setCount(data.length);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    void poll();
    const id = setInterval(() => void poll(), 10_000);
    return () => clearInterval(id);
  }, []);

  // Atualiza marcadores no mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenIds = new Set<string>();

    for (const pin of pins) {
      seenIds.add(pin.collector_id);
      const latlng: L.LatLngTuple = [pin.lat, pin.lng];
      const icon = makeIcon(pin.name, pin.packages);

      const existing = markersRef.current.get(pin.collector_id);
      if (existing) {
        existing.setLatLng(latlng).setIcon(icon);
        existing.setPopupContent(makePopup(pin));
      } else {
        const marker = L.marker(latlng, { icon })
          .bindPopup(makePopup(pin))
          .addTo(map);
        markersRef.current.set(pin.collector_id, marker);
      }
    }

    // Remove marcadores de coletores que saíram
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seenIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Se há pins, centralizar no grupo
    if (pins.length > 0 && markersRef.current.size > 0) {
      const group = L.featureGroup([...markersRef.current.values()]);
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [pins]);

  return (
    <div className="flex h-full">
      {/* Mapa */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* Overlay vazio */}
        {count === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'rgba(6,4,15,0.7)' }}
          >
            <div className="text-5xl mb-4">🛵</div>
            <p className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-rajdhani)' }}>
              Nenhum entregador em rota
            </p>
            <p className="text-sm font-body mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Os pins aparecem assim que um entregador inicia as entregas
            </p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div
        className="w-72 shrink-0 flex flex-col overflow-hidden"
        style={{
          borderLeft:   '1px solid rgba(147,51,234,0.15)',
          background:   'rgba(10,8,22,0.95)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Stats */}
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid rgba(147,51,234,0.12)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-body uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Em rota agora
            </span>
            <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-rajdhani)', color: '#FFD700' }}>
              {count}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Última atualização: {lastUpdate}
            </span>
          </div>
        </div>

        {/* Lista de coletores */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pins.length === 0 ? (
            <p className="text-center text-xs font-body py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Sem entregadores ativos
            </p>
          ) : pins.map(p => (
            <div
              key={p.collector_id}
              className="rounded-xl p-3 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.15)' }}
              onClick={() => {
                const marker = markersRef.current.get(p.collector_id);
                if (marker && mapRef.current) {
                  mapRef.current.setView(marker.getLatLng(), 15, { animate: true });
                  marker.openPopup();
                }
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg,#9333EA,#FFD700)', color: '#06040F', fontFamily: 'var(--font-rajdhani)' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate font-body">{p.name}</p>
                  <p className="text-[10px] font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {p.packages} pacote{p.packages !== 1 ? 's' : ''} em rota
                    {p.speed !== null ? ` · ${Math.round(p.speed)} km/h` : ''}
                  </p>
                </div>
                <div
                  className="text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  Ativo
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function makePopup(p: Pin): string {
  const ago = Math.round((Date.now() - new Date(p.updated_at).getTime()) / 1000);
  const agoStr = ago < 60 ? `${ago}s atrás` : `${Math.round(ago / 60)}min atrás`;
  return `
    <div style="font-family:system-ui,sans-serif;min-width:160px;">
      <strong style="font-size:14px">${p.name}</strong><br/>
      <span style="font-size:11px;color:#666">${p.packages} pacote(s) em rota</span><br/>
      ${p.speed !== null ? `<span style="font-size:11px;color:#888">${Math.round(p.speed)} km/h</span><br/>` : ''}
      <span style="font-size:10px;color:#999">${agoStr}</span>
    </div>
  `;
}
