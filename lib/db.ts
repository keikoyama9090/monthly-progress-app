import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://mock:mock@mock/mock";

export const sql = neon(DATABASE_URL, { fetchOptions: { cache: "no-store" } });
