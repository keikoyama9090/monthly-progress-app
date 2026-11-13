import { sql } from "@/lib/db";
import type { KessanCard } from "@/lib/kessan";

// 完了カードは直近90日分だけ返す（ボードの「完了」列用）
const DONE_KEEP_DAYS = 90;

const CARD_SELECT = `
  SELECT
    k.id, k.client_id, c.name AS client_name, c.sort_order,
    k.period_end::text AS period_end,
    k.stage, k.next_action, k.waiting_since, k.extended,
    k.paid_corporate, k.paid_consumption, k.paid_local,
    k.data_sent, k.bound_mailed,
    k.completed_at, k.created_at, k.updated_at,
    lc.body AS latest_comment, lc.created_at AS latest_comment_at
  FROM kessan_cards k
  JOIN clients c ON c.id = k.client_id
  LEFT JOIN LATERAL (
    SELECT body, created_at FROM kessan_comments
    WHERE card_id = k.id
    ORDER BY created_at DESC
    LIMIT 1
  ) lc ON true
`;

export async function fetchKessanCards(): Promise<KessanCard[]> {
  const rows = await sql.query(
    `${CARD_SELECT}
     WHERE k.completed_at IS NULL
        OR k.completed_at > now() - ($1 || ' days')::interval
     ORDER BY k.period_end ASC, c.sort_order ASC`,
    [String(DONE_KEEP_DAYS)]
  );
  return rows as KessanCard[];
}

export async function fetchKessanCard(id: string): Promise<KessanCard | null> {
  const rows = await sql.query(`${CARD_SELECT} WHERE k.id = $1`, [id]);
  return (rows[0] as KessanCard | undefined) ?? null;
}
