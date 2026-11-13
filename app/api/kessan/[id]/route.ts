import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { fetchKessanCard } from "@/lib/kessan-db";
import { KESSAN_STAGE_KEYS, allPaid, type KessanStage, type KessanNextAction } from "@/lib/kessan";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NEXT_ACTIONS = ["K", "C", "client"];
const BOOL_FIELDS = ["extended", "paid_corporate", "paid_consumption", "paid_local"] as const;

type Params = { params: { id: string } };

// カードの更新：列の移動・次のアクション・資料待ち・延長・納付チェック
export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = await requireSession();
  if (authError) return authError;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const current = await fetchKessanCard(params.id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const next = { ...current };

  if (body.stage !== undefined) {
    if (typeof body.stage !== "string" || !KESSAN_STAGE_KEYS.includes(body.stage as KessanStage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    next.stage = body.stage as KessanStage;
  }
  if (body.next_action !== undefined) {
    if (body.next_action !== null && !NEXT_ACTIONS.includes(body.next_action as string)) {
      return NextResponse.json({ error: "Invalid next_action" }, { status: 400 });
    }
    next.next_action = body.next_action as KessanNextAction;
  }
  if (body.waiting !== undefined) {
    if (typeof body.waiting !== "boolean") {
      return NextResponse.json({ error: "Invalid waiting" }, { status: 400 });
    }
    next.waiting_since = body.waiting ? current.waiting_since ?? new Date().toISOString() : null;
  }
  for (const f of BOOL_FIELDS) {
    if (body[f] !== undefined) {
      if (typeof body[f] !== "boolean") {
        return NextResponse.json({ error: `Invalid ${f}` }, { status: 400 });
      }
      next[f] = body[f] as boolean;
    }
  }

  // 完了は「製本列にいて、納付チェックが全部ついている」ときだけ
  if (next.stage === "done" && current.stage !== "done") {
    if (current.stage !== "binding" || !allPaid(next)) {
      return NextResponse.json(
        { error: "製本列で納付チェックがすべて付いたカードだけ完了にできます" },
        { status: 400 }
      );
    }
  }
  const completedAt =
    next.stage === "done" ? current.completed_at ?? new Date().toISOString() : null;

  await sql`
    UPDATE kessan_cards SET
      stage = ${next.stage},
      next_action = ${next.next_action},
      waiting_since = ${next.waiting_since},
      extended = ${next.extended},
      paid_corporate = ${next.paid_corporate},
      paid_consumption = ${next.paid_consumption},
      paid_local = ${next.paid_local},
      completed_at = ${completedAt},
      updated_at = now()
    WHERE id = ${params.id}
  `;

  return NextResponse.json(await fetchKessanCard(params.id));
}

// 誤って投入したカードの削除
export async function DELETE(_request: NextRequest, { params }: Params) {
  const authError = await requireSession();
  if (authError) return authError;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await sql`DELETE FROM kessan_cards WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

