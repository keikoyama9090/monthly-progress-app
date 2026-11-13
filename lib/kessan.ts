// 決算ボード（v0）の定数・型・計算ロジック
// クライアント側・サーバー側の両方から import される（DBアクセスは含めない）

export const KESSAN_STAGES = [
  {
    key: "todo",
    label: "未着手",
    hint: "今月の決算先",
    steps: ["決算月の翌月に投入された決算先", "資料依頼を始めたら「決算中」へ"],
  },
  {
    key: "working",
    label: "決算中",
    hint: "資料回収→決算処理→申告書作成",
    steps: ["決算資料の依頼・回収", "決算整理・決算書の作成", "法人税・消費税・地方税の申告書作成"],
  },
  {
    key: "review",
    label: "社内レビュー",
    hint: "freee AIチェック・kessan-self-review",
    steps: [
      "freee AIエージェントで申告書チェック",
      "kessan-self-reviewスキルでチェックし、指摘に対応する",
      "2つにチェックが付いたら「クライアント報告」へ",
    ],
  },
  {
    key: "report",
    label: "クライアント報告",
    hint: "報告して申告OKを待つ",
    steps: ["報告文を作成して送る（納税額・納期限・判断ポイント）", "お客様から申告OKをもらう"],
  },
  {
    key: "filing",
    label: "申告",
    hint: "電子申告の送信",
    steps: ["税務署・都道府県・市区町村へ電子申告を送信する"],
  },
  {
    key: "binding",
    label: "製本",
    hint: "送付・郵送・納付確認",
    steps: ["申告書・決算書のデータを送付", "製本した決算書等を郵送", "法人税・消費税・地方税の納付を確認", "5つ揃ったら「完了」へ"],
  },
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
  review_freee_ai: boolean;
  review_self: boolean;
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

export const REVIEW_FIELDS = [
  { key: "review_freee_ai", label: "freee AIエージェントの申告書チェック" },
  { key: "review_self", label: "kessan-self-review" },
] as const;

export type ReviewField = (typeof REVIEW_FIELDS)[number]["key"];

export function reviewDoneCount(card: Pick<KessanCard, ReviewField>): number {
  return REVIEW_FIELDS.filter((f) => card[f.key]).length;
}

export function reviewDone(card: Pick<KessanCard, ReviewField>): boolean {
  return reviewDoneCount(card) === REVIEW_FIELDS.length;
}

/**
 * 社内レビューより後ろの工程へ進めてよいか。
 * 社内レビュー以前（未着手〜社内レビュー）から、クライアント報告以降へ移すときは
 * レビューの2つのチェックが必要。
 */
export function blockedByReview(
  card: Pick<KessanCard, "stage" | ReviewField>,
  target: KessanStage
): boolean {
  const reviewIdx = KESSAN_STAGE_KEYS.indexOf("review");
  return (
    KESSAN_STAGE_KEYS.indexOf(card.stage) <= reviewIdx &&
    KESSAN_STAGE_KEYS.indexOf(target) > reviewIdx &&
    !reviewDone(card)
  );
}

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

/** 日本時間の今日から ymd（YYYY-MM-DD）までの日数。過ぎていればマイナス */
export function daysUntil(ymd: string, today: Date = new Date()): number {
  const todayYmd = today.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(ymd) - toUtc(todayYmd)) / 86400000);
}

export const DEADLINE_WARN_DAYS = 14;

/** 申告期限の緊急度。申告済み（製本・完了）は対象外 */
export function deadlineUrgency(card: Pick<KessanCard, "stage" | "period_end" | "extended">):
  "overdue" | "warn" | "normal" | "filed" {
  if (card.stage === "binding" || card.stage === "done") return "filed";
  const days = daysUntil(filingDeadline(card.period_end, card.extended));
  if (days < 0) return "overdue";
  if (days <= DEADLINE_WARN_DAYS) return "warn";
  return "normal";
}

/** 「あと17日」「本日」「3日超過」 */
export function daysLabel(days: number): string {
  if (days === 0) return "本日";
  return days > 0 ? `あと${days}日` : `${-days}日超過`;
}

/** 日本時間の今日から見た「前月」（決算月として投入する初期値） */
export function previousMonthJST(today: Date = new Date()): { year: number; month: number } {
  const ymd = today.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [y, m] = ymd.split("-").map(Number);
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
}
