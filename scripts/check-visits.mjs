import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envLines = readFileSync(".env.local", "utf-8").split("\n");
const dbLine = envLines.find((l) => l.startsWith("DATABASE_URL="));
const DATABASE_URL = dbLine.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim();

const sql = neon(DATABASE_URL);
const rows = await sql`SELECT client_id, visited_on FROM visits ORDER BY visited_on DESC LIMIT 5`;
console.log(JSON.stringify(rows, null, 2));
