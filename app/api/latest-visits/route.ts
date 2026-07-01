import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await sql`
    SELECT client_id, MAX(visited_on)::text AS visited_on
    FROM visits
    GROUP BY client_id
  `;
  return NextResponse.json(rows as { client_id: string; visited_on: string }[]);
}
