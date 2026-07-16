import { WithholdingAgentClient } from "@/components/withholding-agent-client";
import { sql } from "@/lib/db";
import type { Client, WithholdingAgentTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "源泉代行 | 月次進捗管理",
};

export default async function WithholdingAgentPage() {
  const currentYear = new Date().getFullYear();

  const [clientRows, taskRows] = await Promise.all([
    sql`SELECT * FROM clients WHERE tax_agent = true ORDER BY sort_order ASC`,
    sql`SELECT * FROM withholding_agent_tasks WHERE year = ${currentYear}`,
  ]);

  return (
    <WithholdingAgentClient
      initialClients={clientRows as Client[]}
      initialTasks={taskRows as WithholdingAgentTask[]}
      currentYear={currentYear}
    />
  );
}
