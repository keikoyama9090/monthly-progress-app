import { WeeklyClient } from "@/components/weekly-client";
import { sql } from "@/lib/db";
import type { Client, MonthlyTask } from "@/lib/types";

export const dynamic = "force-dynamic";

function getThisWeekDays(): { year: number; month: number; day: number }[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  });
}

export default async function WeeklyPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [clientRows, taskRows] = await Promise.all([
    sql`SELECT * FROM clients ORDER BY sort_order ASC`,
    sql`SELECT * FROM monthly_tasks WHERE year = ${currentYear} AND month = ${currentMonth}`,
  ]);

  const allClients = clientRows as Client[];
  const tasks = taskRows as MonthlyTask[];

  const thisWeekDays = getThisWeekDays();
  const weeklyClients = allClients.filter((client) => {
    if (client.report_day == null) return false;
    return thisWeekDays.some(
      (d) => d.month === currentMonth && d.day === client.report_day
    );
  });

  return (
    <WeeklyClient
      clients={weeklyClients}
      tasks={tasks}
      year={currentYear}
      month={currentMonth}
    />
  );
}
