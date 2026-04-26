export type Platform = 'mercadolivre' | 'shopee';

export type OrderStatus =
  | 'pending'
  | 'ready_to_ship'
  | 'collected'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface SellerToken {
  id: string;
  seller_id: string;
  platform: Platform;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  created_at: string;
}

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

export interface Collector {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  platform?: Platform;
  polo?: string;
  page?: number;
  limit?: number;
}

export interface CollectOrderBody {
  collectedAt: string;
  collectorId: string;
  trackingScanned: boolean;
}

export interface MLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

export interface SellerCredit {
  id: string;
  seller_id: string;
  credit_limit: number;
  credit_used: number;
  cycle_start: string;
  cycle_end: string;
  updated_at: string;
}

export interface SellerCharge {
  id: string;
  seller_id: string;
  amount_cents: number;
  status: 'pending' | 'paid' | 'expired';
  abacatepay_id: string | null;
  pix_code: string | null;
  qr_code_base64: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string;
}

export type CollectionStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'collected'
  | 'cancelled';

export type TimeWindow = 'manha' | 'tarde' | 'qualquer';

export interface SellerProfile {
  id: string;
  seller_id: string;
  name: string | null;
  phone: string | null;
  cep: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  location_type: string;
  floor_unit: string | null;
  doorman_name: string | null;
  intercom_code: string | null;
  access_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionRequest {
  id: string;
  seller_id: string;
  ml_count: number;
  shopee_count: number;
  ecommerce_count: number;
  ecommerce_proprio_count: number;
  total_count: number;
  ml_order_ids: string[];
  shopee_order_ids: string[];
  notes: string | null;
  time_window: TimeWindow;
  address_snapshot: Record<string, unknown> | null;
  agent_id: string | null;
  status: CollectionStatus;
  requested_at: string;
  accepted_at: string | null;
  en_route_at: string | null;
  arrived_at: string | null;
  collected_at: string | null;
}

export interface SellerDashboardData {
  orders_today: {
    ready_to_ship: number;
    collected: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    total: number;
  };
  credit: {
    limit: number;
    used: number;
    remaining: number;
    pct_remaining: number;
    cycle_start: string;
    cycle_end: string;
    low_credit: boolean;
  };
}

export interface ShopeeTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  request_id: string;
  error: string;
  message: string;
  shop_id: number;
  partner_id: number;
}
