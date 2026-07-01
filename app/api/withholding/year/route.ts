import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { WithholdingTax } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearRaw = parseInt(searchParams.get("year") ?? "0", 10);
  if (!yearRaw || yearRaw < 2000 || yearRaw > 2100) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM withholding_taxes WHERE year = ${yearRaw}
  `;

  return NextResponse.json(rows as WithholdingTax[]);
}
