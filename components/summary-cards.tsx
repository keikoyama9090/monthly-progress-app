"use client";

import { useMemo } from "react";
import type { Client, MonthlyTask } from "@/lib/types";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  clients: Client[];
  tasks: MonthlyTask[];
  latestVisits: Record<string, string>;
  year: number;
};

export function SummaryCards({ clients, tasks, year }: Props) {
  const currentMonth = new Date().getMonth() + 1;

  const stats = useMemo(() => {
    const monthTasks = tasks.filter((t) => t.month === currentMonth);

    let notStarted = 0;
    let allComplete = 0;

    for (const client of clients) {
      const clientMonthTasks = monthTasks.filter(
        (t) => t.client_id === client.id
      );
      const enabledCount = client.enabled_tasks.filter(Boolean).length;

      if (enabledCount === 0) continue;

      const completedCount = clientMonthTasks.filter(
        (t) => t.completed_at !== null && client.enabled_tasks[t.task_index]
      ).length;

      if (completedCount === 0) notStarted++;
      if (completedCount === enabledCount) allComplete++;
    }

    return { notStarted, allComplete };
  }, [clients, tasks, currentMonth]);

  const cards = [
    {
      icon: ClipboardList,
      label: "今月未着手",
      value: stats.notStarted,
      desc: `${year}年${currentMonth}月`,
      highlight: stats.notStarted > 0,
    },
    {
      icon: CheckCircle2,
      label: "今月完了",
      value: stats.allComplete,
      desc: `${year}年${currentMonth}月`,
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "rounded-xl border bg-card p-5 flex items-center gap-4 shadow-sm",
              card.highlight ? "border-amber-200" : "border-border"
            )}
          >
            <div className={cn(
              "rounded-xl p-3 shrink-0",
              card.highlight ? "bg-amber-50" : "bg-muted/60"
            )}>
              <Icon className={cn(
                "size-6",
                card.highlight ? "text-amber-500" : "text-muted-foreground"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">{card.desc}</p>
              <p className={cn(
                "text-3xl font-bold leading-none",
                card.highlight ? "text-amber-600" : "text-foreground"
              )}>
                {card.value}
                <span className="text-sm font-normal ml-1 text-muted-foreground">社</span>
              </p>
              <p className="text-sm font-medium text-foreground mt-1">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
