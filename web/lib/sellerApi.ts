// API client para o painel do seller
// Lê o token de invite do localStorage e injeta em cada requisição

export type OrderStatus =
  | 'pending'
  | 'ready_to_ship'
  | 'collected'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface SellerOrder {
  id: string;
  platform: 'mercadolivre' | 'shopee';
  external_order_id: string;
  tracking_number: string | null;
  status: OrderStatus;
  pickup_address: string | null;
  polo: string | null;
  created_at: string;
}

export interface SellerCredit {
  limit: number;
  used: number;
  remaining: number;
  pct_remaining: number;
  cycle_start: string;
  cycle_end: string;
  low_credit: boolean;
}

export interface SellerCharge {
  id: string;
  amount_cents: number;
  status: 'pending' | 'paid' | 'expired';
  pix_code: string | null;
  qr_code_base64: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string;
}

export interface DashboardData {
  orders_today: {
    ready_to_ship: number;
    collected: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    total: number;
  };
  credit: SellerCredit;
}

export interface FinanceiroData {
  credit: SellerCredit;
  amount_due: number;
  ml_count: number;
  shopee_count: number;
  charges: SellerCharge[];
  pending_charge: SellerCharge | null;
}

export interface PaginatedOrders {
  items: SellerOrder[];
  total: number;
  page: number;
  limit: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function getSellerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('seller_token');
}

export function saveSellerToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('seller_token', token);
}

async function sellerFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getSellerToken();
  const res = await fetch(`${API_BASE}/api/v1/seller${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  if (!json.success || !res.ok) {
    throw new Error(json.error ?? `Erro ${res.status}`);
  }
  return json.data as T;
}

// ─── endpoints ───────────────────────────────────────────────────────────────

export function getDashboard(): Promise<DashboardData> {
  return sellerFetch<DashboardData>('/dashboard', { cache: 'no-store' });
}

export function getPedidos(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedOrders> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page)   qs.set('page',   String(params.page));
  if (params?.limit)  qs.set('limit',  String(params.limit));
  const q = qs.toString();
  return sellerFetch<PaginatedOrders>(`/pedidos${q ? `?${q}` : ''}`, { cache: 'no-store' });
}

export function getFinanceiro(): Promise<FinanceiroData> {
  return sellerFetch<FinanceiroData>('/financeiro', { cache: 'no-store' });
}

export function createCharge(): Promise<SellerCharge> {
  return sellerFetch<SellerCharge>('/financeiro/charge', { method: 'POST' });
}
