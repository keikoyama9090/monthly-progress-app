# 月次進捗管理アプリ

税理士事務所向けの月次業務進捗管理Webアプリ。  
33社のクライアントに対して、月次タスクの完了状況と訪問履歴を管理します。

## 技術スタック

- **Next.js 14** (App Router)
- **shadcn/ui** (@base-ui/react)
- **Tailwind CSS v3**
- **Supabase**（DB）
- **TypeScript**

---

## セットアップ手順

### 1. Supabaseプロジェクト作成

[https://supabase.com](https://supabase.com) でプロジェクトを作成してください。

### 2. テーブル作成

Supabase の SQL Editor で `supabase/schema.sql` を実行してください。

### 3. シードデータ投入

動作確認用（5社）：
```sql
-- supabase/seed.sql を実行
```

本番用（33社）：
```sql
-- supabase/seed_33clients.sql を実行
```

### 4. 環境変数設定

`.env.local` を編集して Supabase の接続情報を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Supabase Dashboard → Project Settings → API から取得できます。

### 5. 開発サーバー起動

```bash
npm install
npm run dev
```

---

## 機能一覧

### ガントテーブル
- 1〜12月の月別タスク完了状況を一覧表示
- 当月列は薄い青背景で強調
- セルの色：全完了（緑）/ 一部完了（X/Y、アンバー）/ 未着手（グレー）

### 右スライドパネル（月セルクリックで開く）
- タスクのチェックオン/オフ（monthly_tasks への upsert）
- 担当者バッジ切替：K → C → なし → K
- 完了タスクへのメモ入力（800ms デバウンス）
- 無効タスクのグレーアウト表示

### 訪問日記録（訪問バッジクリックで開く）
- 訪問バッジ：🔴 45日以上 / 🟡 30〜44日 / + 30日未満
- 日付を選択して保存すると visits テーブルに記録

### サマリーカード（3枚）
- ⚠️ 訪問要確認：最終訪問から45日以上経過した会社数
- 📋 今月未着手：当月タスクが1件も完了していない会社数
- ✅ 今月完了：当月の有効タスクが全て完了している会社数

---

## Vercelデプロイ

```bash
# Vercel CLI でデプロイ
npx vercel --prod
```

環境変数は Vercel Dashboard → Settings → Environment Variables に設定してください。
