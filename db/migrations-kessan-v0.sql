-- 決算ボード v0 のテーブル作成（Neon の SQL Editor で1回だけ実行）
-- supabase/schema.sql 末尾の「決算ボード（v0）」と同じ内容です。
create table if not exists kessan_cards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  period_end date not null,
  stage text not null default 'todo'
    check (stage in ('todo', 'working', 'review', 'report', 'filing', 'binding', 'done')),
  next_action text check (next_action in ('K', 'C', 'client')),
  waiting_since timestamptz,
  extended boolean not null default false,
  paid_corporate boolean not null default false,
  paid_consumption boolean not null default false,
  paid_local boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, period_end)
);
create index if not exists idx_kessan_cards_stage on kessan_cards(stage);

create table if not exists kessan_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references kessan_cards(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_kessan_comments_card on kessan_comments(card_id, created_at desc);
