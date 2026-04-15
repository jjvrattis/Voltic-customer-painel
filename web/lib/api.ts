// ─── Tipos espelhando o backend ──────────────────────────────────────────────

export type Platform = 'mercadolivre' | 'shopee';

export type OrderStatus =
  | 'pending'
  | 'ready_to_ship'
  | 'collected'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  platform: Platform;
  external_order_id: string;
  seller_id: string;
  tracking_number: string | null;
  status: OrderStatus;
  pickup_address: string | null;
  polo: string | null;
  collected_at: string | null;
  collector_id: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface SellerToken {
  id: string;
  seller_id: string;
  platform: Platform;
  expires_at: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  platform?: Platform;
  polo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Cliente base ─────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function saveAdminToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('admin_token', token);
}

export function logoutAdmin(): void {
  if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
}

export async function loginAdmin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as ApiResponse<{ token: string }>;
  if (!json.success || !json.data) throw new Error(json.error ?? `Erro ${res.status}`);
  return json.data.token;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success || !res.ok) {
    throw new Error(json.error ?? `Erro ${res.status} na API`);
  }

  return json.data as T;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface Invite {
  token: string;
  link: string;
  expires_at: string;
}

export async function createInvite(sellerName: string, sellerPhone?: string): Promise<Invite> {
  return apiFetch<Invite>('/onboarding/invite', {
    method: 'POST',
    body: JSON.stringify({ sellerName, sellerPhone }),
  });
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

export async function getOrders(
  filters: OrderFilters = {},
): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams();
  if (filters.status)   params.set('status',   filters.status);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.polo)     params.set('polo',     filters.polo);
  if (filters.page)     params.set('page',     String(filters.page));
  if (filters.limit)    params.set('limit',    String(filters.limit));

  const qs = params.toString();
  return apiFetch<PaginatedResponse<Order>>(`/orders${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  });
}

export async function collectOrder(
  id: string,
  body: { collectedAt: string; collectorId: string; trackingScanned: boolean },
): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}/collect`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ─── Auth — Mercado Livre ─────────────────────────────────────────────────────

export async function getMLAuthUrl(): Promise<string> {
  const data = await apiFetch<{ url: string }>('/auth/ml/url');
  return data.url;
}

export async function refreshMLToken(
  sellerId: string,
): Promise<{ expires_at: string }> {
  return apiFetch<{ expires_at: string }>('/auth/ml/refresh', {
    method: 'POST',
    body: JSON.stringify({ sellerId }),
  });
}

// ─── Auth — Shopee ────────────────────────────────────────────────────────────

export async function getShopeeAuthUrl(): Promise<string> {
  const data = await apiFetch<{ url: string }>('/auth/shopee/url');
  return data.url;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncML(sellerId: string): Promise<{ synced: number }> {
  return apiFetch<{ synced: number }>(`/sync/ml/${sellerId}`, {
    method: 'POST',
  });
}

export async function syncShopee(
  sellerId: string,
): Promise<{ synced: number }> {
  return apiFetch<{ synced: number }>(`/sync/shopee/${sellerId}`, {
    method: 'POST',
  });
}

// ─── Lojistas conectados (requer GET /api/v1/sellers no backend) ──────────────

export async function getConnectedSellers(): Promise<SellerToken[]> {
  return apiFetch<SellerToken[]>('/sellers');
}
