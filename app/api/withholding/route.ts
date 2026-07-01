import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { WithholdingTax } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { client_id, year, month, tax_amount, paid } = body as Record<string, unknown>;

  if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (tax_amount !== null && tax_amount !== undefined && (!Number.isInteger(tax_amount) || (tax_amount as number) < 0)) {
    return NextResponse.json({ error: "Invalid tax_amount" }, { status: 400 });
  }
  if (typeof paid !== "boolean") {
    return NextResponse.json({ error: "Invalid paid" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO withholding_taxes (client_id, year, month, tax_amount, paid, updated_at)
    VALUES (${client_id}, ${year as number}, ${month as number}, ${(tax_amount ?? null) as number | null}, ${paid as boolean}, now())
    ON CONFLICT (client_id, year, month) DO UPDATE SET
      tax_amount = EXCLUDED.tax_amount,
      paid = EXCLUDED.paid,
      updated_at = now()
    RETURNING *
  `;

  return NextResponse.json(rows[0] as WithholdingTax);
}
