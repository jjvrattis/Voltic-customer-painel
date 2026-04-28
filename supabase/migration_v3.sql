-- ============================================================
-- Voltic — Migration v3 (CollectorApp backbone)
-- Execute no Supabase SQL Editor — idempotente
-- ============================================================

-- 1. Estende collectors com auth + zonas de entrega
alter table collectors add column if not exists pin_hash      text;
alter table collectors add column if not exists session_token text;
alter table collectors add column if not exists cep_zones     text[] not null default '{}';

comment on column collectors.pin_hash      is 'bcrypt hash do PIN de 4 dígitos';
comment on column collectors.session_token is 'Token de sessão do CollectorApp';
comment on column collectors.cep_zones     is 'Prefixos de CEP para entrega (ex: [''060'',''061''])';

create index if not exists collectors_session_token_idx on collectors (session_token) where session_token is not null;
create index if not exists collectors_phone_idx         on collectors (phone);

-- 2. Atribuições de coleta: quais sellers cada coletor visita por dia
create table if not exists collector_assignments (
  id           uuid        primary key default gen_random_uuid(),
  collector_id uuid        not null references collectors(id) on delete cascade,
  seller_id    text        not null,
  days_of_week integer[]   not null default '{1,2,3,4,5}',
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  constraint collector_assignments_uq unique (collector_id, seller_id)
);

comment on table  collector_assignments              is 'Sellers atribuídos a cada coletor por dia da semana';
comment on column collector_assignments.days_of_week is '0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab';

create index if not exists collector_assignments_collector_idx on collector_assignments (collector_id);
create index if not exists collector_assignments_seller_idx    on collector_assignments (seller_id);
alter table collector_assignments enable row level security;

-- 3. Scans: registro de cada bipagem (coleta, base, entrega)
create table if not exists scans (
  id                    uuid             primary key default gen_random_uuid(),
  collector_id          uuid             not null references collectors(id) on delete cascade,
  tracking_code         text             not null,
  scan_type             text             not null,
  -- pickup | hub_arrival | delivery_pickup | delivered
  order_id              uuid             references orders(id) on delete set null,
  collection_request_id uuid             references collection_requests(id) on delete set null,
  lat                   double precision,
  lng                   double precision,
  scanned_at            timestamptz      not null default now()
);

comment on column scans.scan_type is 'pickup | hub_arrival | delivery_pickup | delivered';

create index if not exists scans_collector_idx on scans (collector_id);
create index if not exists scans_tracking_idx  on scans (tracking_code);
create index if not exists scans_type_idx      on scans (scan_type);
create index if not exists scans_date_idx      on scans (scanned_at desc);
alter table scans enable row level security;

-- 4. Deliveries: comprovantes de entrega com prova
create table if not exists deliveries (
  id                 uuid        primary key default gen_random_uuid(),
  order_id           uuid        not null references orders(id) on delete cascade,
  collector_id       uuid        not null references collectors(id) on delete cascade,
  recipient_name     text,
  recipient_document text,
  photo_url          text,
  notes              text,
  delivered_at       timestamptz not null default now(),
  constraint deliveries_order_uq unique (order_id)
);

create index if not exists deliveries_collector_idx    on deliveries (collector_id);
create index if not exists deliveries_delivered_at_idx on deliveries (delivered_at desc);
alter table deliveries enable row level security;

-- 5. Colunas adicionais em orders para logística de entrega
alter table orders add column if not exists delivered_at  timestamptz;
alter table orders add column if not exists delivery_cep  text;

comment on column orders.delivered_at is 'Timestamp da confirmação de entrega ao cliente final';
comment on column orders.delivery_cep is '3 primeiros dígitos do CEP do destinatário — roteamento de entrega';

create index if not exists orders_delivery_cep_idx on orders (delivery_cep) where delivery_cep is not null;
