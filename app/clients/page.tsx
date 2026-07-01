import { ClientsClient } from "@/components/clients-client";
import { sql } from "@/lib/db";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "クライアント管理 | 月次進捗管理",
};

export default async function ClientsPage() {
  const rows = await sql`SELECT * FROM clients ORDER BY sort_order ASC`;
  return <ClientsClient initialClients={rows as Client[]} />;
}
