-- ============================================================
-- Voltic — Migration v2
-- Perfil do seller, seleção de pedidos e coletas detalhadas
-- Executar no Supabase SQL Editor
-- ============================================================

-- ── seller_profiles ───────────────────────────────────────────────────────────
create table if not exists seller_profiles (
  id                uuid        primary key default gen_random_uuid(),
  seller_id         text        not null unique,
  name              text,
  phone             text,
  cep               text,
  street            text,
  street_number     text,
  complement        text,
  neighborhood      text,
  city              text,
  state             char(2),
  location_type     text        not null default 'residencia',
  -- residencia | predio_comercial | galpao | loja
  floor_unit        text,
  doorman_name      text,
  intercom_code     text,
  access_notes      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table  seller_profiles                    is 'Perfil e endereço de coleta dos sellers';
comment on column seller_profiles.location_type      is 'residencia | predio_comercial | galpao | loja';
comment on column seller_profiles.floor_unit         is 'Andar, sala ou número da unidade';
comment on column seller_profiles.doorman_name       is 'Nome do porteiro ou responsável';
comment on column seller_profiles.intercom_code      is 'Código do interfone / senha do portão';
comment on column seller_profiles.access_notes       is 'Instruções fixas de acesso (ex: usar elevador de serviço)';

create index if not exists seller_profiles_seller_id_idx on seller_profiles (seller_id);
alter  table seller_profiles enable row level security;

-- ── Atualiza collection_requests ─────────────────────────────────────────────
-- Passo 1 — novos campos de contagem por plataforma
alter table collection_requests
  add column if not exists shopee_count             integer not null default 0,
  add column if not exists ecommerce_proprio_count  integer not null default 0,
  add column if not exists ml_order_ids             text[]  not null default '{}',
  add column if not exists shopee_order_ids         text[]  not null default '{}',
  add column if not exists time_window              text    not null default 'qualquer',
  add column if not exists address_snapshot         jsonb,
  add column if not exists agent_id                 uuid    references collectors(id) on delete set null,
  add column if not exists accepted_at              timestamptz,
  add column if not exists en_route_at              timestamptz,
  add column if not exists arrived_at               timestamptz;

-- Passo 2 — recriar total_count cobrindo todas as categorias
alter table collection_requests drop column if exists total_count;
alter table collection_requests
  add column total_count integer
    generated always as (
      ml_count + shopee_count + ecommerce_count + ecommerce_proprio_count
    ) stored;

comment on column collection_requests.ml_order_ids            is 'external_order_ids dos pedidos ML selecionados pelo seller';
comment on column collection_requests.shopee_order_ids        is 'external_order_ids dos pedidos Shopee selecionados pelo seller';
comment on column collection_requests.shopee_count            is 'Derivado de array_length(shopee_order_ids, 1)';
comment on column collection_requests.ecommerce_proprio_count is 'Pacotes e-commerce próprio com dimensões definidas — R$8 cada';
comment on column collection_requests.time_window             is 'Janela de horário preferida: manha | tarde | qualquer';
comment on column collection_requests.address_snapshot        is 'Snapshot do endereço no momento da solicitação';
comment on column collection_requests.agent_id                is 'Agente Voltic responsável pela coleta';
