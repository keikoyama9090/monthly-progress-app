import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Visit } from "@/lib/types";
import { requireApiKey } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { client_id, visited_on } = body as {
    client_id: unknown;
    visited_on: unknown;
  };

  if (typeof client_id !== "string" || !UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }
  if (typeof visited_on !== "string" || !DATE_RE.test(visited_on)) {
    return NextResponse.json(
      { error: "visited_on must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  await sql`DELETE FROM visits WHERE client_id = ${client_id}`;
  const rows = await sql`
    INSERT INTO visits (client_id, visited_on)
    VALUES (${client_id}, ${visited_on})
    RETURNING *
  `;

  return NextResponse.json(rows[0] as Visit);
}
