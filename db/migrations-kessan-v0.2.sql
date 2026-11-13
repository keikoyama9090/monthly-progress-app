-- 決算ボード v0.2：社内レビューのチェックを追加（デプロイ前に Neon で1回実行）
alter table kessan_cards add column if not exists review_freee_ai boolean not null default false;
alter table kessan_cards add column if not exists review_self boolean not null default false;
