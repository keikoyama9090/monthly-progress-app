import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { WithholdingAgentTask } from "@/lib/types";
import { requireApiKey } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMMENT_MAX_LENGTH = 4000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearRaw = parseInt(searchParams.get("year") ?? "0", 10);
  if (!yearRaw || yearRaw < 2000 || yearRaw > 2100) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM withholding_agent_tasks WHERE year = ${yearRaw}
  `;
  return NextResponse.json(rows as WithholdingAgentTask[]);
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { client_id, year, month, completed, comment } = body as Record<string, unknown>;

  if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid completed" }, { status: 400 });
  }
  if (
    comment !== undefined &&
    comment !== null &&
    (typeof comment !== "string" || comment.length > COMMENT_MAX_LENGTH)
  ) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }
  if (completed === undefined && comment === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existingRows = await sql`
    SELECT * FROM withholding_agent_tasks
    WHERE client_id = ${client_id} AND year = ${year as number} AND month = ${month as number}
  `;
  const existing = existingRows[0] as WithholdingAgentTask | undefined;

  const completed_at =
    completed !== undefined
      ? completed
        ? new Date().toISOString()
        : null
      : existing?.completed_at ?? null;
  const commentVal = comment !== undefined ? (comment as string | null) : existing?.comment ?? null;

  const rows = await sql`
    INSERT INTO withholding_agent_tasks (client_id, year, month, completed_at, comment)
    VALUES (${client_id}, ${year as number}, ${month as number}, ${completed_at}, ${commentVal})
    ON CONFLICT (client_id, year, month) DO UPDATE SET
      completed_at = EXCLUDED.completed_at,
      comment = EXCLUDED.comment
    RETURNING *
  `;

  return NextResponse.json(rows[0] as WithholdingAgentTask);
}
