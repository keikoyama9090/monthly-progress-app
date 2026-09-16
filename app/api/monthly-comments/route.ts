import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { MonthlyComment } from "@/lib/types";
import { requireApiKey } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMMENT_MAX_LENGTH = 4000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id") ?? "";
  const yearRaw = parseInt(searchParams.get("year") ?? "0", 10);
  const monthRaw = parseInt(searchParams.get("month") ?? "0", 10);

  if (!UUID_RE.test(clientId)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (!yearRaw || yearRaw < 2000 || yearRaw > 2100) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }
  if (!monthRaw || monthRaw < 1 || monthRaw > 12) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM monthly_comments
    WHERE client_id = ${clientId} AND year = ${yearRaw} AND month = ${monthRaw}
  `;
  return NextResponse.json((rows[0] as MonthlyComment | undefined) ?? null);
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { client_id, year, month, comment, has_freee_comment } = body as Record<string, unknown>;

  if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (comment !== null && comment !== undefined && (typeof comment !== "string" || comment.length > COMMENT_MAX_LENGTH)) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }
  if (has_freee_comment !== undefined && typeof has_freee_comment !== "boolean") {
    return NextResponse.json({ error: "Invalid has_freee_comment" }, { status: 400 });
  }

  const commentVal = (comment as string | null | undefined) ?? null;
  const hasFreeeCommentVal = (has_freee_comment as boolean | undefined) ?? false;

  const rows = await sql`
    INSERT INTO monthly_comments (client_id, year, month, comment, has_freee_comment, updated_at)
    VALUES (${client_id}, ${year as number}, ${month as number}, ${commentVal}, ${hasFreeeCommentVal}, now())
    ON CONFLICT (client_id, year, month) DO UPDATE SET
      comment = EXCLUDED.comment,
      has_freee_comment = EXCLUDED.has_freee_comment,
      updated_at = now()
    RETURNING *
  `;

  return NextResponse.json(rows[0] as MonthlyComment);
}
