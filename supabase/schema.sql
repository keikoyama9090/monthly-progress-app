-- clients テーブル
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  enabled_tasks boolean[] not null default '{true,true,true,true,true}',
  created_at timestamptz default now()
);

-- monthly_tasks テーブル
create table if not exists monthly_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  year integer not null,
  month integer not null,
  task_index integer not null check (task_index between 0 and 4),
  completed_at timestamptz,
  assignee text check (assignee in ('K', 'C')),
  memo text,
  created_at timestamptz default now(),
  unique(client_id, year, month, task_index)
);

-- visits テーブル
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  visited_on date not null,
  created_at timestamptz default now()
);

-- 源泉税月次データテーブル
create table if not exists withholding_taxes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  tax_amount integer,               -- 源泉税額（円）
  paid boolean not null default false,  -- 納付済みフラグ
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(client_id, year, month)
);

-- 年末調整テーブル
create table if not exists year_end_adjustments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  year integer not null,
  adjustment_type text not null check (adjustment_type in ('refund', 'surcharge')),
  amount integer not null default 0,  -- 金額（円）
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(client_id, year)
);

-- RLS を有効化
alter table clients enable row level security;
alter table monthly_tasks enable row level security;
alter table visits enable row level security;

-- ポリシー: 認証済みかつ許可ドメインのユーザーのみ読み書き可能
-- ALLOWED_EMAIL_DOMAIN 環境変数と合わせてドメインを設定してください（例: yourdomain.com）
create policy "authenticated_domain" on clients
  for all using (
    auth.role() = 'authenticated' AND
    auth.email() LIKE '%@' || current_setting('app.allowed_domain', true)
  );

create policy "authenticated_domain" on monthly_tasks
  for all using (
    auth.role() = 'authenticated' AND
    auth.email() LIKE '%@' || current_setting('app.allowed_domain', true)
  );

create policy "authenticated_domain" on visits
  for all using (
    auth.role() = 'authenticated' AND
    auth.email() LIKE '%@' || current_setting('app.allowed_domain', true)
  );

alter table withholding_taxes enable row level security;
alter table year_end_adjustments enable row level security;

create policy "authenticated_domain" on withholding_taxes
  for all using (
    auth.role() = 'authenticated' AND
    auth.email() LIKE '%@' || current_setting('app.allowed_domain', true)
  );

create policy "authenticated_domain" on year_end_adjustments
  for all using (
    auth.role() = 'authenticated' AND
    auth.email() LIKE '%@' || current_setting('app.allowed_domain', true)
  );

-- withholding_taxes テーブルへの追加カラム（給与等・報酬等の内訳）
alter table withholding_taxes
  add column if not exists salary_tax integer,
  add column if not exists fee_tax integer;

-- clients テーブルへの追加カラム
alter table clients
  add column if not exists fiscal_month integer check (fiscal_month between 1 and 12),
  add column if not exists report_day integer check (report_day between 1 and 31),
  add column if not exists withholding_type text check (withholding_type in ('standard', 'special')),
  add column if not exists industry text,
  add column if not exists tax_agent boolean not null default false,
  add column if not exists no_visit boolean not null default false;

-- year 単独検索のパフォーマンス向上のためのインデックス
create index if not exists idx_monthly_tasks_year on monthly_tasks(year);
create index if not exists idx_monthly_tasks_year_client on monthly_tasks(year, client_id);
create index if not exists idx_withholding_taxes_year on withholding_taxes(year);
create index if not exists idx_withholding_taxes_year_client on withholding_taxes(year, client_id);
create index if not exists idx_year_end_adjustments_year on year_end_adjustments(year);

-- 源泉税代行の進捗管理テーブル（tax_agent = true のクライアントのみ対象）
create table if not exists withholding_agent_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(client_id, year, month)
);

alter table withholding_agent_tasks enable row level security;

create policy "authenticated_domain" on withholding_agent_tasks
  for all using (
    auth.role() = 'authenticated' AND
    auth.email() LIKE '%@' || current_setting('app.allowed_domain', true)
  );

create index if not exists idx_withholding_agent_tasks_year on withholding_agent_tasks(year);
create index if not exists idx_withholding_agent_tasks_year_client on withholding_agent_tasks(year, client_id);

-- 各クライアントの最新訪問日を返す RPC 関数
create or replace function get_latest_visits()
returns table(client_id uuid, visited_on date)
language sql
security definer
as $$
  select distinct on (client_id) client_id, visited_on
  from visits
  order by client_id, visited_on desc;
$$;
