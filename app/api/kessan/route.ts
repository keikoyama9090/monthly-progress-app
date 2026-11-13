import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { fetchKessanCards } from "@/lib/kessan-db";
import { periodEndOf } from "@/lib/kessan";

export const dynamic = "force-dynamic";

// ボード表示用：未完了カード＋直近の完了カード
export async function GET() {
  const authError = await requireSession();
  if (authError) return authError;

  return NextResponse.json(await fetchKessanCards());
}

// 投入：指定した年月が決算月の顧問先（個人を除く）のカードを未着手に作る。
// 既にカードがある先はスキップする。
export async function POST(request: NextRequest) {
  const authError = await requireSession();
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { year, month } = body;

  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const periodEnd = periodEndOf(year as number, month as number);

  const inserted = await sql`
    INSERT INTO kessan_cards (client_id, period_end, extended)
    SELECT
      c.id,
      ${periodEnd}::date,
      -- 前期のカードで延長ありなら引き継ぐ
      COALESCE((
        SELECT prev.extended FROM kessan_cards prev
        WHERE prev.client_id = c.id AND prev.period_end < ${periodEnd}::date
        ORDER BY prev.period_end DESC LIMIT 1
      ), false)
    FROM clients c
    WHERE c.fiscal_month = ${month as number}
      AND (c.entity_type IS NULL OR c.entity_type <> 'individual')
    ON CONFLICT (client_id, period_end) DO NOTHING
    RETURNING id
  `;

  return NextResponse.json({ inserted: inserted.length, period_end: periodEnd });
}
