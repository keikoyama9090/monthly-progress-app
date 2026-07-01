import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { MonthlyTask } from "@/lib/types";
import { TASKS } from "@/lib/constants";
import { requireApiKey } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMO_MAX_LENGTH = 1000;
const MAX_TASK_INDEX = TASKS.length - 1;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearRaw = parseInt(searchParams.get("year") ?? "0", 10);
  const monthRaw = parseInt(searchParams.get("month") ?? "0", 10);

  if (!yearRaw || yearRaw < 2000 || yearRaw > 2100) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }
  if (!monthRaw || monthRaw < 1 || monthRaw > 12) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT * FROM monthly_tasks WHERE year = ${yearRaw} AND month = ${monthRaw}
  `;
  return NextResponse.json(rows as MonthlyTask[]);
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { client_id, year, month, task_index, completed, memo } =
    body as Record<string, unknown>;

  if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (!Number.isInteger(task_index) || (task_index as number) < 0 || (task_index as number) > MAX_TASK_INDEX) {
    return NextResponse.json({ error: "Invalid task_index" }, { status: 400 });
  }
  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid completed" }, { status: 400 });
  }
  if (memo !== null && memo !== undefined && (typeof memo !== "string" || memo.length > MEMO_MAX_LENGTH)) {
    return NextResponse.json({ error: "Invalid memo" }, { status: 400 });
  }

  const completed_at = completed ? new Date().toISOString() : null;
  const memoVal = (memo as string | null | undefined) ?? null;

  const rows = await sql`
    INSERT INTO monthly_tasks (client_id, year, month, task_index, completed_at, memo)
    VALUES (${client_id}, ${year as number}, ${month as number}, ${task_index as number}, ${completed_at}, ${memoVal})
    ON CONFLICT (client_id, year, month, task_index) DO UPDATE SET
      completed_at = EXCLUDED.completed_at,
      memo = EXCLUDED.memo
    RETURNING *
  `;

  return NextResponse.json(rows[0] as MonthlyTask);
}
