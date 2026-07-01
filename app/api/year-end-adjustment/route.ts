import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { YearEndAdjustment } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearRaw = parseInt(searchParams.get("year") ?? "0", 10);
  if (!yearRaw || yearRaw < 2000 || yearRaw > 2100) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM year_end_adjustments WHERE year = ${yearRaw}
  `;

  return NextResponse.json(rows as YearEndAdjustment[]);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { client_id, year, adjustment_type, amount } = body as Record<string, unknown>;

  if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (adjustment_type !== "refund" && adjustment_type !== "surcharge") {
    return NextResponse.json({ error: "Invalid adjustment_type" }, { status: 400 });
  }
  if (!Number.isInteger(amount) || (amount as number) < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO year_end_adjustments (client_id, year, adjustment_type, amount, updated_at)
    VALUES (${client_id}, ${year as number}, ${adjustment_type as string}, ${amount as number}, now())
    ON CONFLICT (client_id, year) DO UPDATE SET
      adjustment_type = EXCLUDED.adjustment_type,
      amount = EXCLUDED.amount,
      updated_at = now()
    RETURNING *
  `;

  return NextResponse.json(rows[0] as YearEndAdjustment);
}
