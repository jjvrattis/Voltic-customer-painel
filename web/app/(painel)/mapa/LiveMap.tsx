'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
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
const GMAPS_KEY = '***REMOVED***';

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',           stylers: [{ color: '#0e0b1e' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0b1e' }] },
  { featureType: 'road',               elementType: 'geometry',        stylers: [{ color: '#1a1535' }] },
  { featureType: 'road',               elementType: 'geometry.stroke', stylers: [{ color: '#2a2050' }] },
  { featureType: 'road.highway',       elementType: 'geometry',        stylers: [{ color: '#2a1f5e' }] },
  { featureType: 'water',              elementType: 'geometry',        stylers: [{ color: '#050d1a' }] },
  { featureType: 'poi',  stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a1f5e' }] },
];

async function fetchPins(): Promise<Pin[]> {
  const token = getAdminToken();
  if (!token) return [];
  try {
    const res  = await fetch(`${API_BASE}/api/v1/admin/map`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    const json = await res.json() as { success: boolean; data?: { pins: Pin[] } };
    return json.success ? (json.data?.pins ?? []) : [];
  } catch { return []; }
}

function makeMarkerContent(name: string, packages: number): HTMLElement {
  const initial = name.charAt(0).toUpperCase();
  const div = document.createElement('div');
  div.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;';
  div.innerHTML = `
    <div style="
      width:44px;height:44px;border-radius:50%;
      background:linear-gradient(135deg,#9333EA,#7C3AED);
      border:3px solid #FFD700;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;font-weight:800;color:#fff;
      box-shadow:0 0 16px rgba(147,51,234,0.6);
      font-family:system-ui,sans-serif;
    ">${initial}${packages > 0 ? `<div style="
      position:absolute;top:-4px;right:-6px;
      background:#EF4444;color:#fff;border-radius:10px;padding:1px 5px;
      font-size:10px;font-weight:700;border:2px solid #06040F;
    ">${packages}</div>` : ''}</div>
    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #9333EA;margin-top:-2px;"></div>
  `;
  return div;
}

export default function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<google.maps.Map | null>(null);
  const markersRef   = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [pins,        setPins]        = useState<Pin[]>([]);
  const [lastUpdate,  setLastUpdate]  = useState<string | null>(null);
  const [selected,    setSelected]    = useState<Pin | null>(null);
  const [mapReady,    setMapReady]    = useState(false);

  // Inicializa mapa
  useEffect(() => {
    const loader = new Loader({ apiKey: GMAPS_KEY, version: 'weekly', libraries: ['maps', 'marker'] });
    loader.load().then(async () => {
      if (!containerRef.current) return;
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      const map = new Map(containerRef.current, {
        center: { lat: -23.55, lng: -46.63 },
        zoom: 12,
        styles: DARK_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        mapId: 'voltic-admin-map',
      });
      mapRef.current = map;
      setMapReady(true);
    }).catch(console.error);
  }, []);

  // Polling 10s
  const poll = useCallback(async () => {
    const data = await fetchPins();
    setPins(data);
    setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), 10_000);
    return () => clearInterval(id);
  }, [poll]);

  // Atualiza markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    google.maps.importLibrary('marker').then(async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
      const map = mapRef.current!;
      const seenIds = new Set<string>();

      for (const pin of pins) {
        seenIds.add(pin.collector_id);
        const pos = { lat: pin.lat, lng: pin.lng };

        const existing = markersRef.current.get(pin.collector_id);
        if (existing) {
          existing.position = pos;
          existing.content  = makeMarkerContent(pin.name, pin.packages);
        } else {
          const marker = new AdvancedMarkerElement({
            map, position: pos,
            content: makeMarkerContent(pin.name, pin.packages),
            title: pin.name,
          });
          marker.addListener('click', () => setSelected(pin));
          markersRef.current.set(pin.collector_id, marker);
        }
      }

      markersRef.current.forEach((marker, id) => {
        if (!seenIds.has(id)) { marker.map = null; markersRef.current.delete(id); }
      });

      if (pins.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 80);
      }
    }).catch(console.error);
  }, [pins, mapReady]);

  return (
    <div className="flex h-full">
      {/* Mapa */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {pins.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ background: 'rgba(6,4,15,0.7)' }}>
            <div className="text-5xl mb-4">🛵</div>
            <p className="text-white/40 text-sm font-body">Nenhum coletor ativo no momento</p>
          </div>
        )}

        {/* Barra inferior */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(6,4,15,0.85)', border: '1px solid rgba(147,51,234,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
            <span className="text-[11px] font-body text-white/50">{pins.length} ativo{pins.length !== 1 ? 's' : ''}</span>
          </div>
          {lastUpdate && (
            <span className="text-[10px] font-body text-white/25 px-2">atualizado {lastUpdate}</span>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-72 shrink-0 flex flex-col" style={{ background: 'rgba(6,4,15,0.95)', borderLeft: '1px solid rgba(147,51,234,0.15)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(147,51,234,0.15)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] font-body" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Coletores ao vivo
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
              <p className="text-sm font-body text-white/20">Sem coletores ativos</p>
            </div>
          ) : (
            pins.map(pin => (
              <button
                key={pin.collector_id}
                onClick={() => {
                  setSelected(pin);
                  mapRef.current?.panTo({ lat: pin.lat, lng: pin.lng });
                  mapRef.current?.setZoom(15);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-white/5"
                style={{ borderBottom: '1px solid rgba(147,51,234,0.08)', background: selected?.collector_id === pin.collector_id ? 'rgba(147,51,234,0.1)' : 'transparent' }}
              >
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-[#06040F]"
                  style={{ background: 'linear-gradient(135deg,#9333EA,#7C3AED)', border: '2px solid #FFD700', boxShadow: '0 0 8px rgba(255,215,0,0.3)' }}>
                  {pin.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate font-body">{pin.name}</p>
                  <p className="text-[11px] text-white/30 font-body">
                    {pin.packages} pacote{pin.packages !== 1 ? 's' : ''}
                    {pin.speed != null && pin.speed > 0 ? ` · ${Math.round(pin.speed)} km/h` : ''}
                  </p>
                </div>
                {pin.packages > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: '#EF4444' }}>
                    {pin.packages}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Popup selecionado */}
      {selected && (
        <div className="absolute top-4 left-4 w-64 rounded-2xl p-4 z-10" style={{ background: 'rgba(14,11,30,0.95)', border: '1px solid rgba(147,51,234,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white font-body">{selected.name}</p>
              <p className="text-[10px] text-white/30 font-body uppercase tracking-wider">Coletor ativo</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.15)' }}>
              <p className="text-xl font-bold text-purple-400 font-display">{selected.packages}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider font-body">pacotes</p>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(147,51,234,0.15)' }}>
              <p className="text-xl font-bold text-blue-400 font-display">{selected.speed != null ? `${Math.round(selected.speed)}` : '—'}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider font-body">km/h</p>
            </div>
          </div>
          <p className="text-[10px] text-white/20 mt-2 text-center font-body">
            {new Date(selected.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}
