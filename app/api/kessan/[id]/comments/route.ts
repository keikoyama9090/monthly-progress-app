import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import type { KessanComment } from "@/lib/kessan";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BODY_MAX_LENGTH = 500;

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const authError = await requireSession();
  if (authError) return authError;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const rows = await sql`
    SELECT * FROM kessan_comments WHERE card_id = ${params.id}
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows as KessanComment[]);
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireSession();
  if (authError) return authError;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length === 0 || text.length > BODY_MAX_LENGTH) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO kessan_comments (card_id, body)
    SELECT id, ${text} FROM kessan_cards WHERE id = ${params.id}
    RETURNING *
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await sql`UPDATE kessan_cards SET updated_at = now() WHERE id = ${params.id}`;
  return NextResponse.json(rows[0] as KessanComment);
}
