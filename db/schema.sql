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
