import { HomeClient } from "@/components/home-client";
import { sql } from "@/lib/db";
import type { Client, MonthlyTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [clientRows, taskRows, visitRows] = await Promise.all([
    sql`SELECT * FROM clients ORDER BY sort_order ASC`,
    sql`SELECT * FROM monthly_tasks WHERE year = ${currentYear}`,
    sql`
      SELECT client_id, MAX(visited_on)::text AS visited_on
      FROM visits
      GROUP BY client_id
    `,
  ]);

  const clients = clientRows as Client[];
  const tasks = taskRows as MonthlyTask[];
  const latestVisits: Record<string, string> = {};
  for (const row of visitRows as { client_id: string; visited_on: string }[]) {
    latestVisits[row.client_id] = row.visited_on;
  }

  return (
    <HomeClient
      initialClients={clients}
      initialTasks={tasks}
      initialLatestVisits={latestVisits}
      currentYear={currentYear}
      currentMonth={currentMonth}
    />
  );
}
