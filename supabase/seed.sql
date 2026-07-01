-- ダミークライアント 5社（動作確認用）
insert into clients (name, sort_order, enabled_tasks) values
  ('株式会社アルファ商事', 1, '{true,true,true,true,true}'),
  ('有限会社ベータ製作所', 2, '{true,true,false,true,true}'),
  ('合同会社ガンマコンサルティング', 3, '{true,true,true,false,true}'),
  ('株式会社デルタフーズ', 4, '{true,false,false,true,true}'),
  ('イプシロン医療クリニック', 5, '{true,true,true,true,false}');
