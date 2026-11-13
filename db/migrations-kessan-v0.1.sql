-- 決算ボード v0.1：製本列のチェック（データ送付・製本郵送）を追加
-- Neon の SQL Editor で1回だけ実行（デプロイ前に）
alter table kessan_cards add column if not exists data_sent boolean not null default false;
alter table kessan_cards add column if not exists bound_mailed boolean not null default false;
