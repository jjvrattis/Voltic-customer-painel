-- ============================================================
-- Voltic — Supabase Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────
create type platform_enum as enum ('mercadolivre', 'shopee');

create type order_status_enum as enum (
  'pending',
  'ready_to_ship',
  'collected',
  'shipped',
  'delivered',
  'cancelled'
);

-- ── collectors ───────────────────────────────────────────────
create table if not exists collectors (
  id     uuid primary key default uuid_generate_v4(),
  name   text not null,
  phone  text not null,
  active boolean not null default true
);

comment on table collectors is 'Entregadores/coletores da Voltic';

-- ── seller_tokens ────────────────────────────────────────────
create table if not exists seller_tokens (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     text not null,
  platform      platform_enum not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),

  constraint seller_tokens_seller_platform_uq unique (seller_id, platform)
);

comment on table seller_tokens is 'Tokens OAuth dos sellers por plataforma';

create index if not exists seller_tokens_expires_at_idx on seller_tokens (expires_at);

-- ── orders ───────────────────────────────────────────────────
create table if not exists orders (
  id                uuid primary key default uuid_generate_v4(),
  platform          platform_enum not null,
  external_order_id text not null,
  seller_id         text not null,
  tracking_number   text,
  status            order_status_enum not null default 'ready_to_ship',
  pickup_address    text,
  polo              text,
  collected_at      timestamptz,
  collector_id      uuid references collectors (id) on delete set null,
  raw_payload       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),

  constraint orders_platform_external_id_uq unique (platform, external_order_id)
);

comment on table orders is 'Pedidos sincronizados das plataformas (ML + Shopee)';

create index if not exists orders_status_idx      on orders (status);
create index if not exists orders_platform_idx    on orders (platform);
create index if not exists orders_polo_idx        on orders (polo);
create index if not exists orders_seller_id_idx   on orders (seller_id);
create index if not exists orders_created_at_idx  on orders (created_at desc);
create index if not exists orders_raw_payload_idx on orders using gin (raw_payload);

-- ── onboarding_invites ───────────────────────────────────────────────────────
create table if not exists onboarding_invites (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  seller_name   text not null,
  seller_phone  text,
  status        text not null default 'pending',  -- pending | connected
  seller_id     text,                              -- preenchido após conexão
  created_at    timestamptz not null default now(),
  connected_at  timestamptz,
  expires_at    timestamptz not null               -- criado com +7 dias por padrão
);

comment on table onboarding_invites is 'Links de onboarding enviados para sellers';

create index if not exists onboarding_invites_token_idx  on onboarding_invites (token);
create index if not exists onboarding_invites_status_idx on onboarding_invites (status);

alter table onboarding_invites enable row level security;

-- ── seller_credits ────────────────────────────────────────────────────────────
create table if not exists seller_credits (
  id            uuid primary key default gen_random_uuid(),
  seller_id     text not null unique,
  credit_limit  integer not null default 100,
  credit_used   integer not null default 0,
  cycle_start   date not null default current_date,
  cycle_end     date not null default (current_date + interval '14 days'),
  updated_at    timestamptz not null default now()
);

comment on table seller_credits is 'Crédito quinzenal disponível por seller';

create index if not exists seller_credits_seller_id_idx on seller_credits (seller_id);

alter table seller_credits enable row level security;

-- ── seller_charges ────────────────────────────────────────────────────────────
create table if not exists seller_charges (
  id              uuid primary key default gen_random_uuid(),
  seller_id       text not null,
  amount_cents    integer not null,
  status          text not null default 'pending',  -- pending | paid | expired
  abacatepay_id   text unique,
  pix_code        text,
  qr_code_base64  text,
  created_at      timestamptz not null default now(),
  paid_at         timestamptz,
  expires_at      timestamptz not null
);

comment on table seller_charges is 'Cobranças Pix geradas para sellers';

create index if not exists seller_charges_seller_id_idx    on seller_charges (seller_id);
create index if not exists seller_charges_status_idx       on seller_charges (status);
create index if not exists seller_charges_abacatepay_idx   on seller_charges (abacatepay_id);

alter table seller_charges enable row level security;

-- ── collection_requests ──────────────────────────────────────────────────────
create table if not exists collection_requests (
  id               uuid primary key default gen_random_uuid(),
  seller_id        text not null,
  ml_count         integer not null default 0,
  ecommerce_count  integer not null default 0,
  total_count      integer generated always as (ml_count + ecommerce_count) stored,
  notes            text,
  status           text not null default 'pending',  -- pending | collected | cancelled
  requested_at     timestamptz not null default now(),
  collected_at     timestamptz
);

comment on table collection_requests is 'Solicitações manuais de coleta feitas pelos sellers';

create index if not exists collection_requests_seller_id_idx  on collection_requests (seller_id);
create index if not exists collection_requests_status_idx     on collection_requests (status);
create index if not exists collection_requests_requested_at_idx on collection_requests (requested_at desc);

alter table collection_requests enable row level security;

-- ── admin_accounts ───────────────────────────────────────────────────────────
create table if not exists admin_accounts (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,
  session_token  text,
  created_at     timestamptz not null default now()
);

comment on table admin_accounts is 'Contas de administrador do painel Voltic';

-- ── seller_accounts ───────────────────────────────────────────────────────────
create table if not exists seller_accounts (
  id             uuid primary key default gen_random_uuid(),
  seller_id      text not null,
  email          text not null unique,
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

comment on table seller_accounts is 'Credenciais de acesso dos sellers ao app mobile';

create index if not exists seller_accounts_seller_id_idx on seller_accounts (seller_id);

-- ── Row Level Security (habilitar mas sem policies restritivas por ora) ──────
alter table seller_tokens    enable row level security;
alter table orders            enable row level security;
alter table collectors        enable row level security;
alter table admin_accounts    enable row level security;
alter table seller_accounts   enable row level security;

-- Service role bypasses RLS — a API usa service_role_key, então tem acesso total.
-- Adicione policies específicas se quiser expor via anon/auth keys no futuro.

-- ── Trigger: incrementa credit_used a cada pedido novo ───────────────────────
create or replace function increment_seller_credit()
returns trigger as $$
begin
  insert into seller_credits (seller_id, credit_used)
  values (NEW.seller_id, 1)
  on conflict (seller_id)
  do update set
    credit_used = seller_credits.credit_used + 1,
    updated_at  = now();
  return NEW;
end;
$$ language plpgsql;

create trigger order_inserted_increment_credit
after insert on orders
for each row
execute function increment_seller_credit();
