-- ============================================================
-- Voltic — Migration v4: Hub-and-Spoke Refactor
-- Inclui: auth por telefone, regras de negócio, transportadoras,
--         hubs, sub-bases, janelas de despacho, rotas, contratos,
--         feature flags
-- Execute no Supabase SQL Editor — idempotente
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- MIGRAÇÃO 1: Auth por Telefone
-- ────────────────────────────────────────────────────────────

-- Adiciona campos de telefone em seller_accounts
-- (seller_accounts.id = UUID interno; seller_id = ML/texto externo usado nas rotas)
alter table seller_accounts
  add column if not exists phone               text unique,
  add column if not exists phone_verified_at   timestamptz,
  add column if not exists legacy_email_login  boolean default true;

comment on column seller_accounts.phone              is 'Telefone normalizado com DDI (ex: 5511999998888)';
comment on column seller_accounts.phone_verified_at  is 'Quando o telefone foi verificado via OTP';
comment on column seller_accounts.legacy_email_login is 'true enquanto o seller ainda usa email/senha (migração gradual)';

create index if not exists seller_accounts_phone_idx on seller_accounts (phone) where phone is not null;

-- Códigos OTP temporários (TTL 5min, max 5 tentativas)
create table if not exists phone_verification_codes (
  id         uuid        primary key default gen_random_uuid(),
  phone      text        not null,
  code       text        not null,
  expires_at timestamptz not null,
  attempts   int         default 0,
  used_at    timestamptz,
  ip         text,
  created_at timestamptz default now()
);

create index if not exists pvc_phone_expires_idx on phone_verification_codes (phone, expires_at);

-- RLS: só service role pode acessar (nunca exposto ao client-side)
alter table phone_verification_codes enable row level security;

-- Sessões baseadas em telefone (substitui onboarding_invites)
create table if not exists phone_sessions (
  id            uuid        primary key default gen_random_uuid(),
  account_type  text        not null check (account_type in ('seller', 'collector', 'admin', 'carrier')),
  account_id    uuid        not null,
  session_token text        unique not null,
  device_info   jsonb,
  last_used_at  timestamptz default now(),
  expires_at    timestamptz,
  created_at    timestamptz default now()
);

create index if not exists ps_token_idx      on phone_sessions (session_token);
create index if not exists ps_account_idx    on phone_sessions (account_type, account_id);

alter table phone_sessions enable row level security;

-- RLS: seller só vê a própria sessão
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'phone_sessions'
      and policyname = 'seller sees own sessions'
  ) then
    execute $pol$
      create policy "seller sees own sessions"
        on phone_sessions for select
        using (account_type = 'seller' and account_id::text = auth.uid()::text)
    $pol$;
  end if;
end $$;


-- ────────────────────────────────────────────────────────────
-- MIGRAÇÃO 2: Regras de Negócio Editáveis
-- ────────────────────────────────────────────────────────────

create table if not exists business_rules (
  key         text        primary key,
  value       jsonb       not null,
  description text,
  updated_by  uuid,
  updated_at  timestamptz default now()
);

comment on table business_rules is 'Parâmetros operacionais editáveis pelo admin sem redeploy';

-- Seed inicial (insert ignora se já existe)
insert into business_rules (key, value, description) values
  ('runner_radius_km',           '5',                                                             'Raio máx pra runner aceitar coleta (km)')                     on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('sla_promised_minutes',       '120',                                                           'SLA prometido ao cliente final (min)')                         on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('dispatch_window_minutes',    '45',                                                            'Intervalo entre saídas troncais (min)')                        on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('min_packages_per_window',    '3',                                                             'Pacotes mínimos pra disparar janela (senão junta com próxima)') on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('platform_fee_marketplace',   '0.05',                                                          'Taxa Voltic no marketplace (5%)')                              on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('subbase_default_commission', '0.65',                                                          'Comissão default das sub-bases (65%)')                         on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('hub_polos',                  '["Brás","25 de Março","Santa Efigênia","Bom Retiro"]',          'Polos com hub ativo')                                          on conflict (key) do nothing;
insert into business_rules (key, value, description) values
  ('cancel_window_minutes',      '10',                                                            'Janela pra lojista cancelar coleta após criar (min)')           on conflict (key) do nothing;


-- ────────────────────────────────────────────────────────────
-- MIGRAÇÃO 3 + 4: Transportadoras, Hubs, Hub-and-Spoke
-- (carriers criado antes de sub_bases pra satisfazer FK)
-- ────────────────────────────────────────────────────────────

-- Transportadoras parceiras
create table if not exists carriers (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  cnpj                 text        unique,
  legal_representative text,
  contact_phone        text        not null,
  contact_email        text,
  bank_info            jsonb,
  active               boolean     default true,
  created_at           timestamptz default now()
);

comment on table carriers is 'Transportadoras parceiras (sub-bases terceirizadas)';

-- Contas de usuário da transportadora
create table if not exists carrier_accounts (
  id                uuid        primary key default gen_random_uuid(),
  carrier_id        uuid        not null references carriers(id) on delete cascade,
  phone             text        unique not null,
  name              text        not null,
  role              text        default 'manager' check (role in ('manager', 'operator', 'viewer')),
  phone_verified_at timestamptz,
  active            boolean     default true,
  created_at        timestamptz default now()
);

create index if not exists ca_carrier_idx on carrier_accounts (carrier_id);
create index if not exists ca_phone_idx   on carrier_accounts (phone);

-- Hubs físicos (polo Brás, 25 de Março, etc.)
create table if not exists hubs (
  id               uuid        primary key default gen_random_uuid(),
  polo             text        not null,
  name             text        not null,
  address          text        not null,
  lat              numeric(10, 7),
  lng              numeric(10, 7),
  capacity         int         default 200,
  operating_hours  jsonb,
  active           boolean     default true,
  created_at       timestamptz default now()
);

comment on column hubs.operating_hours is 'Ex: {"mon":["08:00","20:00"],"tue":["08:00","20:00"]}';

-- Sub-bases por zona (gerenciadas por transportadoras)
create table if not exists sub_bases (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  carrier_id        uuid        references carriers(id),
  zones             jsonb,
  commission_pct    numeric(4, 3) default 0.65,
  capacity_per_day  int         default 100,
  sla_target_minutes int        default 90,
  active            boolean     default true,
  created_at        timestamptz default now()
);

comment on column sub_bases.zones is 'Ex: ["Zona Sul","Vila Mariana","Saúde"]';

create index if not exists sb_carrier_idx on sub_bases (carrier_id) where carrier_id is not null;

-- Janelas de despacho troncal (saída do hub a cada 45min)
create table if not exists dispatch_windows (
  id              uuid        primary key default gen_random_uuid(),
  hub_id          uuid        not null references hubs(id) on delete cascade,
  departs_at      timestamptz not null,
  status          text        default 'open' check (status in ('open', 'closed', 'dispatched', 'completed', 'cancelled')),
  vehicle_id      uuid,
  manifest_url    text,
  total_packages  int         default 0,
  total_sub_bases int         default 0,
  created_at      timestamptz default now()
);

create index if not exists dw_hub_departs_idx on dispatch_windows (hub_id, departs_at);
create index if not exists dw_status_idx      on dispatch_windows (status) where status in ('open', 'closed');

-- Rota lógica por pedido (abstração do percurso completo)
create table if not exists routes (
  id              uuid        primary key default gen_random_uuid(),
  order_id        uuid        not null references orders(id) on delete cascade,
  status          text        default 'pending' check (status in (
                                'pending', 'runner_assigned', 'at_hub', 'in_trunk',
                                'at_subbase', 'out_for_delivery', 'delivered', 'failed', 'cancelled'
                              )),
  sla_promised_at timestamptz not null,
  current_leg     int         default 1,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists routes_order_idx  on routes (order_id);
create index if not exists routes_status_idx on routes (status) where status not in ('delivered', 'cancelled', 'failed');

-- Pernas individuais da rota (runner → hub → troncal → sub-base → cliente)
create table if not exists route_legs (
  id                  uuid        primary key default gen_random_uuid(),
  route_id            uuid        not null references routes(id) on delete cascade,
  leg_number          int         not null,
  leg_type            text        not null check (leg_type in ('runner', 'trunk', 'final')),
  from_type           text,
  from_id             uuid,
  to_type             text,
  to_id               uuid,
  assigned_to_type    text,
  assigned_to_id      uuid,
  dispatch_window_id  uuid        references dispatch_windows(id),
  status              text        default 'pending' check (status in ('pending', 'assigned', 'in_progress', 'completed', 'failed')),
  started_at          timestamptz,
  completed_at        timestamptz,
  proof_url           text,
  notes               text,
  created_at          timestamptz default now(),
  constraint route_legs_route_leg_uq unique (route_id, leg_number)
);

create index if not exists rl_route_idx       on route_legs (route_id, leg_number);
create index if not exists rl_assignee_idx    on route_legs (assigned_to_id, status) where assigned_to_id is not null;
create index if not exists rl_window_idx      on route_legs (dispatch_window_id) where dispatch_window_id is not null;

-- Habilita Realtime nas tabelas de tracking (para mapa ao vivo)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'route_legs'
  ) then
    alter publication supabase_realtime add table route_legs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'routes'
  ) then
    alter publication supabase_realtime add table routes;
  end if;
end $$;


-- ────────────────────────────────────────────────────────────
-- MIGRAÇÃO 5: Contratos Digitais
-- ────────────────────────────────────────────────────────────

create table if not exists contracts (
  id              uuid        primary key default gen_random_uuid(),
  version         text        not null,
  contract_type   text        check (contract_type in ('seller', 'carrier', 'subbase')),
  title           text        not null,
  pdf_url         text,
  slides_content  jsonb,
  full_text       text        not null,
  active          boolean     default true,
  active_from     timestamptz default now(),
  created_at      timestamptz default now()
);

comment on column contracts.slides_content is 'Array de slides: [{title, body, image_url}]';
comment on column contracts.full_text      is 'Texto completo — hash SHA256 registrado na assinatura';

create table if not exists signed_contracts (
  id                  uuid        primary key default gen_random_uuid(),
  contract_id         uuid        not null references contracts(id),
  signer_type         text        not null check (signer_type in ('seller', 'carrier', 'subbase')),
  signer_id           uuid        not null,
  signed_at           timestamptz default now(),
  ip                  text,
  user_agent          text,
  geolocation         jsonb,
  contract_sha256     text        not null,
  signature_image_url text
);

create index if not exists sc_contract_idx on signed_contracts (contract_id);
create index if not exists sc_signer_idx   on signed_contracts (signer_type, signer_id);


-- ────────────────────────────────────────────────────────────
-- MIGRAÇÃO 6: Feature Flags
-- ────────────────────────────────────────────────────────────

create table if not exists feature_flags (
  key                 text        primary key,
  enabled_for_all     boolean     default false,
  enabled_for_sellers uuid[]      default '{}',
  enabled_for_carriers uuid[]     default '{}',
  description         text,
  updated_at          timestamptz default now()
);

comment on table feature_flags is 'Feature flags granulares: por seller, por carrier, ou all';

-- Seed
insert into feature_flags (key, description) values
  ('new_hub_and_spoke',    'Rotear pedido pelo novo modelo hub→troncal→sub-base')  on conflict (key) do nothing;
insert into feature_flags (key, description) values
  ('phone_auth_only',      'Desligar login email/senha completamente')              on conflict (key) do nothing;
insert into feature_flags (key, description) values
  ('desktop_app_required', 'Forçar uso do app desktop para o lojista')             on conflict (key) do nothing;
insert into feature_flags (key, description) values
  ('marketplace_v1',       'Habilitar marketplace próprio')                        on conflict (key) do nothing;
