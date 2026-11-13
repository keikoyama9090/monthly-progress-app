// 決算ボード（v0）の定数・型・計算ロジック
// クライアント側・サーバー側の両方から import される（DBアクセスは含めない）

export const KESSAN_STAGES = [
  { key: "todo", label: "未着手", hint: "今月の決算先" },
  { key: "working", label: "決算中", hint: "資料依頼・決算処理・申告書作成" },
  { key: "review", label: "社内レビュー", hint: "freee申告書チェック・self kessan review" },
  { key: "report", label: "クライアント報告", hint: "報告して申告OKを待つ" },
  { key: "filing", label: "申告", hint: "電子申告の送信" },
  { key: "binding", label: "製本", hint: "データ送付・製本郵送・納付確認" },
] as const;

export type KessanStage = (typeof KESSAN_STAGES)[number]["key"] | "done";

export const KESSAN_STAGE_KEYS: KessanStage[] = [
  ...KESSAN_STAGES.map((s) => s.key),
  "done",
];

export type KessanNextAction = "K" | "C" | "client" | null;

export type KessanCard = {
  id: string;
  client_id: string;
  client_name: string;
  sort_order: number;
  period_end: string; // YYYY-MM-DD
  stage: KessanStage;
  next_action: KessanNextAction;
  waiting_since: string | null;
  extended: boolean;
  paid_corporate: boolean;
  paid_consumption: boolean;
  paid_local: boolean;
  data_sent: boolean;
  bound_mailed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  latest_comment: string | null;
  latest_comment_at: string | null;
};

export type KessanComment = {
  id: string;
  card_id: string;
  body: string;
  created_at: string;
};

export const PAID_FIELDS = [
  { key: "paid_corporate", label: "法人税" },
  { key: "paid_consumption", label: "消費税" },
  { key: "paid_local", label: "地方税" },
] as const;

export type PaidField = (typeof PAID_FIELDS)[number]["key"];

export const BINDING_FIELDS = [
  { key: "data_sent", label: "データ送付" },
  { key: "bound_mailed", label: "製本郵送" },
] as const;

export type BindingField = (typeof BINDING_FIELDS)[number]["key"];

/** 完了に必要なチェック（製本・送付2つ＋納付確認3つ） */
export const COMPLETION_FIELDS = [...BINDING_FIELDS, ...PAID_FIELDS] as const;

/** 決算月の末日（YYYY-MM-DD） */
export function periodEndOf(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/** 申告期限 = 決算日の2か月後の月末（延長ありは3か月後の月末）。土日祝の繰り下げはしない */
export function filingDeadline(periodEnd: string, extended: boolean): string {
  const [y, m] = periodEnd.split("-").map(Number);
  const add = extended ? 3 : 2;
  const total = m + add; // 1-based month
  const dy = y + Math.floor((total - 1) / 12);
  const dm = ((total - 1) % 12) + 1;
  return periodEndOf(dy, dm);
}

/** 「2026年9月期」 */
export function periodLabel(periodEnd: string): string {
  const [y, m] = periodEnd.split("-").map(Number);
  return `${y}年${m}月期`;
}

/** 「11/30」 */
export function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

export function allPaid(card: Pick<KessanCard, PaidField>): boolean {
  return card.paid_corporate && card.paid_consumption && card.paid_local;
}

/** 完了までに残っているチェックの数 */
export function remainingChecks(card: Pick<KessanCard, PaidField | BindingField>): number {
  return COMPLETION_FIELDS.filter((f) => !card[f.key]).length;
}

export function canComplete(card: KessanCard): boolean {
  return card.stage === "binding" && remainingChecks(card) === 0;
}

/** 日本時間の今日から見た「前月」（決算月として投入する初期値） */
export function previousMonthJST(today: Date = new Date()): { year: number; month: number } {
  const ymd = today.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [y, m] = ymd.split("-").map(Number);
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
}
