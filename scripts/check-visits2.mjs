import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envLines = readFileSync(".env.local", "utf-8").split("\n");
const dbLine = envLines.find((l) => l.startsWith("DATABASE_URL="));
const DATABASE_URL = dbLine.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim();

const sql = neon(DATABASE_URL);
const rows = await sql`
  SELECT client_id, to_char(MAX(visited_on) AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD') AS visited_on
  FROM visits
  GROUP BY client_id
`;
console.log(JSON.stringify(rows, null, 2));
