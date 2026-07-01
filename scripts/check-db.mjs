import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envLines = readFileSync(".env.local", "utf-8").split("\n");
const dbLine = envLines.find((l) => l.startsWith("DATABASE_URL="));
const DATABASE_URL = dbLine.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim();

const sql = neon(DATABASE_URL);
const rows = await sql`SELECT id, name FROM clients ORDER BY sort_order`;
rows.forEach(r => console.log(r.name));
