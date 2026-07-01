"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TASKS } from "@/lib/constants";
import type { Assignee, Client, MonthlyTask } from "@/lib/types";
import { CheckCircle2, Circle, CalendarClock } from "lucide-react";
import { AppNav, AppLogo } from "@/components/app-nav";

type Props = {
  /** report_day が今週に含まれるクライアントのみ */
  clients: Client[];
  tasks: MonthlyTask[];
  year: number;
  month: number;
};

type AssigneeTaskItem = {
  client: Client;
  taskIndex: number;
  taskName: string;
  completed: boolean;
  memo: string | null;
};

const ASSIGNEES: Assignee[] = ["K", "C"];


const ASSIGNEE_BADGE: Record<string, string> = {
  K: "bg-blue-100 text-blue-700",
  C: "bg-violet-100 text-violet-700",
};

const ASSIGNEE_HEADER_ACCENT: Record<string, string> = {
  K: "border-blue-400",
  C: "border-violet-400",
};

function getWeekLabel(year: number, month: number): string {
  const now = new Date();
  // 今週の月曜～日曜
  const dayOfWeek = now.getDay(); // 0=日 ... 6=土
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;
  return `${year}年${month}月  ${fmt(monday)}（月）〜${fmt(sunday)}（日）`;
}

function ClientTaskCard({
  client,
  items,
  showCompleted,
}: {
  client: Client;
  items: AssigneeTaskItem[];
  showCompleted: boolean;
}) {
  const visible = showCompleted
    ? items
    : items.filter((i) => !i.completed);

  if (visible.length === 0) return null;

  const doneCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const allDone = doneCount === totalCount;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-4 py-3 space-y-2 shadow-sm",
        allDone && "opacity-60"
      )}
    >
      {/* クライアント名 + 報告期限 */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-semibold truncate",
            allDone ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {client.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {client.report_day != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {client.report_day}日
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* タスク一覧 */}
      <ul className="space-y-1">
        {visible.map((item) => (
          <li
            key={item.taskIndex}
            className={cn(
              "flex items-start gap-2 text-sm",
              item.completed
                ? "text-muted-foreground"
                : "text-foreground"
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-muted-foreground/50" />
            ) : (
              <Circle className="size-4 shrink-0 mt-0.5 text-foreground/40" />
            )}
            <span
              className={cn(
                item.completed && "line-through"
              )}
            >
              {item.taskName}
              {item.memo && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  （{item.memo}）
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeeklyClient({ clients, tasks, year, month }: Props) {
  const [showCompleted, setShowCompleted] = useState(true);

  // 担当者ごとに「クライアント × タスク」リストを構築
  const assigneeMap = useMemo<Record<string, AssigneeTaskItem[]>>(() => {
    const map: Record<string, AssigneeTaskItem[]> = { K: [], C: [] };

    const taskMap = new Map<string, MonthlyTask>();
    for (const t of tasks) {
      if (t.year === year && t.month === month) {
        taskMap.set(`${t.client_id}:${t.task_index}`, t);
      }
    }

    for (const client of clients) {
      client.enabled_tasks.forEach((enabled, taskIndex) => {
        if (!enabled) return;
        const assignee = client.task_assignees[taskIndex];
        if (!assignee || !(assignee in map)) return;

        const record = taskMap.get(`${client.id}:${taskIndex}`);
        const completed = record?.completed_at != null;

        map[assignee].push({
          client,
          taskIndex,
          taskName: TASKS[taskIndex],
          completed,
          memo: record?.memo ?? null,
        });
      });
    }

    return map;
  }, [clients, tasks, year, month]);

  // クライアントごとにグループ化
  const groupByClient = (items: AssigneeTaskItem[]) => {
    const groups = new Map<string, AssigneeTaskItem[]>();
    for (const item of items) {
      const arr = groups.get(item.client.id) ?? [];
      arr.push(item);
      groups.set(item.client.id, arr);
    }
    // sort_order 順に並べ替え
    return Array.from(groups.entries()).sort(
      ([, a], [, b]) => a[0].client.sort_order - b[0].client.sort_order
    );
  };

  const weekLabel = getWeekLabel(year, month);

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-0 flex items-stretch gap-6 h-12">
          <AppLogo />
          <AppNav active="weekly" />

          <div className="flex-1" />

          {/* 完了タスク表示トグル */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              完了済みも表示
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* 週ラベル */}
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-foreground">今週やること</h1>
          <span className="text-sm text-muted-foreground">{weekLabel}</span>
        </div>

        {/* 担当者別カラム */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {clients.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <CalendarClock className="size-10 opacity-20" />
              <p className="text-sm">今週が報告期限のクライアントはいません</p>
            </div>
          ) : (
            ASSIGNEES.map((assignee) => {
            if (!assignee) return null;
            const items = assigneeMap[assignee] ?? [];
            const groups = groupByClient(items);

            const undoneCount = items.filter((i) => !i.completed).length;
            const doneCount = items.filter((i) => i.completed).length;
            const totalCount = items.length;

            // 表示するグループが存在するか
            const visibleGroups = groups.filter(([, clientItems]) => {
              const visible = showCompleted
                ? clientItems
                : clientItems.filter((i) => !i.completed);
              return visible.length > 0;
            });

            return (
              <div key={assignee} className="space-y-3">
                {/* 担当者ヘッダー */}
                <div
                  className={cn(
                    "flex items-center gap-3 pb-2 border-b-2",
                    ASSIGNEE_HEADER_ACCENT[assignee]
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                      ASSIGNEE_BADGE[assignee]
                    )}
                  >
                    {assignee}
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    担当 {assignee}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{undoneCount}</span>件未完了
                    <span className="text-muted-foreground/40">／</span>
                    <span>{doneCount}</span>件完了
                    <span className="text-muted-foreground/40">（計{totalCount}件）</span>
                  </div>
                </div>

                {/* クライアントカード一覧 */}
                {visibleGroups.length > 0 ? (
                  <div className="space-y-2">
                    {visibleGroups.map(([clientId, clientItems]) => (
                      <ClientTaskCard
                        key={clientId}
                        client={clientItems[0].client}
                        items={clientItems}
                        showCompleted={showCompleted}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <CheckCircle2 className="size-8 opacity-30" />
                    <p className="text-sm">すべて完了しています</p>
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      </main>
    </div>
  );
}
