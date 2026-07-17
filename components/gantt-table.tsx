"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { MONTHS } from "@/lib/constants";
import type { Client, MonthlyTask } from "@/lib/types";
import {
  getDaysElapsed,
  getVisitStatus,
  formatVisitDate,
} from "@/lib/visit-utils";
import { VisitPopover, VisitQuickSave } from "./visit-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Assignee } from "@/lib/types";

type Props = {
  clients: Client[];
  tasks: MonthlyTask[];
  latestVisits: Record<string, string>;
  year: number;
  onCellClick: (clientId: string, month: number) => void;
  onVisitSaved: (clientId: string, visitedOn: string) => void;
};

function getCellData(
  tasks: MonthlyTask[],
  client: Client
): { completed: number; total: number; nextAssignee: Assignee } {
  const enabledIndices = client.enabled_tasks
    .map((enabled, i) => (enabled ? i : -1))
    .filter((i) => i >= 0);
  const total = enabledIndices.length;
  if (total === 0) return { completed: 0, total: 0, nextAssignee: null };
  const completed = tasks.filter(
    (t) => t.completed_at !== null && enabledIndices.includes(t.task_index)
  ).length;

  // 未完了の最初のタスクの担当者 = このセルで次にアクションすべき人
  const nextIndex = enabledIndices.find(
    (i) => !tasks.some((t) => t.task_index === i && t.completed_at !== null)
  );
  const nextAssignee =
    nextIndex !== undefined ? client.task_assignees?.[nextIndex] ?? null : null;

  return { completed, total, nextAssignee };
}

function GanttCell({
  tasks,
  client,
  isCurrentMonth,
  showNextIndicator,
  onClick,
}: {
  tasks: MonthlyTask[];
  client: Client;
  isCurrentMonth: boolean;
  showNextIndicator: boolean;
  onClick: () => void;
}) {
  const { completed, total, nextAssignee } = getCellData(tasks, client);
  const ratio = total === 0 ? 0 : completed / total;
  const isComplete = total > 0 && completed === total;

  // 次にアクションすべき人（K/C/クライアント）に応じてバーの色を変える。
  // 未完了タスクに担当者が未設定のときはグレーのまま（従来の見た目）。
  const assigneeBarColor =
    nextAssignee === "K"
      ? "bg-primary"
      : nextAssignee === "C"
      ? "bg-violet-400"
      : nextAssignee === "client"
      ? "bg-rose-400"
      : "bg-foreground";

  const barColor = isComplete
    ? "bg-emerald-400"
    : ratio === 0
    ? "bg-muted/0"
    : ratio <= 0.25
    ? cn(assigneeBarColor, "opacity-30")
    : ratio <= 0.5
    ? cn(assigneeBarColor, "opacity-45")
    : ratio <= 0.75
    ? cn(assigneeBarColor, "opacity-60")
    : cn(assigneeBarColor, "opacity-75");

  const indicatorColor =
    nextAssignee === "K"
      ? "bg-primary/60"
      : nextAssignee === "C"
      ? "bg-violet-400/70"
      : nextAssignee === "client"
      ? "bg-rose-400/70"
      : "bg-primary/50";

  return (
    <td className="p-0">
      <div
        className={cn(
          "w-14 h-10 border-r border-border/60 cursor-pointer transition-colors select-none relative overflow-hidden",
          isCurrentMonth ? "bg-primary/5" : "bg-background",
          isCurrentMonth ? "hover:bg-primary/10" : "hover:bg-muted/40"
        )}
        onClick={onClick}
      >
        {/* 前月完了済かつ当月未着手のとき：左端に細い強調ライン（次の担当者の色） */}
        {showNextIndicator && ratio === 0 && (
          <div className={cn("absolute left-0 top-1 bottom-1 w-0.5 rounded-full", indicatorColor)} />
        )}
        {/* 完了率に応じた縦バー（下から立ち上がる、次の担当者の色で着色） */}
        {ratio > 0 && (
          <div
            className={cn(
              "absolute bottom-0 left-1 right-1 rounded-t-sm transition-all duration-300",
              barColor
            )}
            style={{ height: `${Math.max(ratio * 100, 15)}%` }}
          />
        )}
        {/* 完了アイコン（全完了時のみ） */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 12 12"
              className="w-3 h-3 text-emerald-800/60 relative z-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </div>
        )}
      </div>
    </td>
  );
}

const VISIT_MAX_DAYS = 60;
const VISIT_WARN_PCT = (30 / VISIT_MAX_DAYS) * 100;
const VISIT_DANGER_PCT = (45 / VISIT_MAX_DAYS) * 100;

function VisitCell({
  clientId,
  latestVisit,
  noVisit,
  onSaved,
}: {
  clientId: string;
  latestVisit: string | undefined;
  noVisit: boolean;
  onSaved: (clientId: string, visitedOn: string) => void;
}) {
  if (noVisit) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-[10px] text-muted-foreground/30 select-none">訪問不要</span>
      </div>
    );
  }

  const days = getDaysElapsed(latestVisit);
  const status = getVisitStatus(days);
  const barWidth = days === null ? 0 : Math.min((days / VISIT_MAX_DAYS) * 100, 100);

  const barColor =
    status === "danger" ? "bg-red-400" :
    status === "warn"   ? "bg-amber-400" :
    "bg-foreground/15";

  if (status === "none") {
    return (
      <div className="flex flex-col gap-1 w-full px-2">
        <div className="flex justify-center">
          <VisitQuickSave clientId={clientId} onSaved={onSaved} />
        </div>
      </div>
    );
  }

  const textColor =
    status === "danger" ? "text-red-600" :
    status === "warn"   ? "text-amber-600" :
    "text-muted-foreground";

  const formattedDate = formatVisitDate(latestVisit);

  return (
    <div className="flex flex-col gap-0.5 w-full px-1.5">
      <VisitPopover clientId={clientId} initialDate={latestVisit} onSaved={onSaved}>
        <div className="relative h-1 bg-muted/60 rounded-full overflow-visible w-full cursor-pointer">
          <div
            className={cn("absolute left-0 top-0 h-full rounded-full transition-all", barColor)}
            style={{ width: `${barWidth}%` }}
          />
          <div className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-border/80" style={{ left: `${VISIT_WARN_PCT}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-border/80" style={{ left: `${VISIT_DANGER_PCT}%` }} />
        </div>
      </VisitPopover>
      <div className="flex items-center justify-center gap-1">
        <VisitPopover clientId={clientId} initialDate={latestVisit} onSaved={onSaved}>
          <span className={cn("text-xs font-medium tabular-nums whitespace-nowrap cursor-pointer", textColor)}>
            {days}日経過
          </span>
        </VisitPopover>
        <VisitQuickSave clientId={clientId} onSaved={onSaved} />
      </div>
      {formattedDate && (
        <VisitPopover clientId={clientId} initialDate={latestVisit} onSaved={onSaved}>
          <div className="flex justify-center cursor-pointer">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums whitespace-nowrap">
              {formattedDate}に記録
            </span>
          </div>
        </VisitPopover>
      )}
    </div>
  );
}

export function GanttTable({
  clients,
  tasks,
  latestVisits,
  year,
  onCellClick,
  onVisitSaved: onVisitSaved,
}: Props) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const taskMap = useMemo(() => {
    const map: Record<string, MonthlyTask[]> = {};
    for (const t of tasks) {
      const key = `${t.client_id}:${t.month}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div className="rounded-xl border border-border shadow-sm bg-card h-full flex flex-col">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/60 text-[11px] text-muted-foreground shrink-0">
        <span className="font-semibold text-muted-foreground/70">次のアクション:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />K
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-violet-400" />C
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-400" />クライアント
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400" />完了
        </span>
      </div>
      <div className="overflow-auto flex-1 min-h-0">
      <table className="border-collapse text-sm" style={{ minWidth: "900px" }}>
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="sticky top-0 z-20 bg-muted/50 text-center px-2 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide border-r border-border/60 w-10 min-w-[40px]">
              決算
            </th>
            <th className="sticky top-0 left-0 z-30 bg-muted/50 text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide border-r border-border w-40 min-w-[160px]">
              会社名
            </th>
            <th className="sticky top-0 left-40 z-30 bg-muted/50 text-center px-2 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide border-r border-border w-24 min-w-[96px]">
              訪問
            </th>
            {MONTHS.map((m) => {
              const isCurrent = year === currentYear && m === currentMonth;
              return (
                <th
                  key={m}
                  className={cn(
                    "sticky top-0 z-20 text-center px-1 py-2.5 text-xs border-r border-border/60 w-14 min-w-[56px]",
                    isCurrent
                      ? "bg-primary/15 text-primary font-bold tracking-wide border-b-2 border-b-primary/60"
                      : "bg-muted/50 text-muted-foreground font-semibold"
                  )}
                >
                  {isCurrent ? (
                    <span className="inline-flex flex-col items-center gap-0.5">
                      <span>{m}月</span>
                      <span className="w-3 h-0.5 rounded-full bg-primary/60 inline-block" />
                    </span>
                  ) : (
                    `${m}月`
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {clients.map((client, idx) => {
            const visitStatus = getVisitStatus(getDaysElapsed(latestVisits[client.id]));
            const rowDangerTint = !client.no_visit && visitStatus === "danger";
            const rowWarnTint  = !client.no_visit && visitStatus === "warn";
            return (
            <tr
              key={client.id}
              className={cn(
                "border-b border-border/60 hover:bg-muted/30 transition-colors",
                rowDangerTint ? "bg-red-50/60" :
                rowWarnTint   ? "bg-amber-50/40" :
                idx % 2 === 0 ? "bg-card" : "bg-muted/10"
              )}
            >
              <td className="border-r border-border/60 px-1 py-0 text-center">
                {client.fiscal_month != null ? (
                  <span className="text-xs text-muted-foreground tabular-nums">{client.fiscal_month}月</span>
                ) : (
                  <span className="text-muted-foreground/30 text-xs">─</span>
                )}
              </td>
              <td className="sticky left-0 z-10 bg-inherit border-r border-border px-3 py-0">
                <Tooltip>
                  <TooltipTrigger className="flex items-start gap-2 py-2 focus:outline-none text-left w-full cursor-default">
                    <Building2 className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-sm text-foreground">{client.name}</span>
                      {client.report_day != null && (
                        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                          毎月{client.report_day}日まで
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex flex-col gap-1 text-xs">
                    <p className="font-semibold">{client.name}</p>
                    {client.industry && <p className="text-muted-foreground">{client.industry}</p>}
                    <div className="flex gap-3 text-muted-foreground">
                      {client.fiscal_month != null && <span>決算 {client.fiscal_month}月</span>}
                      {client.report_day != null && <span>報告期限 毎月{client.report_day}日</span>}
                      {client.withholding_type && (
                        <span>{client.withholding_type === "standard" ? "源泉税：原則" : "源泉税：特例"}</span>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </td>

              <td className={cn(
                "sticky left-40 z-10 bg-inherit border-r border-border p-0",
                client.no_visit && "opacity-40"
              )}>
                <div className="flex items-center justify-center h-10 w-24">
                  <VisitCell
                    clientId={client.id}
                    latestVisit={latestVisits[client.id]}
                    noVisit={client.no_visit}
                    onSaved={onVisitSaved}
                  />
                </div>
              </td>

              {MONTHS.map((m) => {
                const key = `${client.id}:${m}`;
                const cellTasks = taskMap[key] ?? [];
                const isCurrentMonth =
                  year === currentYear && m === currentMonth;

                // 前月が全完了かどうかを判定
                const prevMonth = m - 1;
                let showNextIndicator = false;
                if (prevMonth >= 1) {
                  const prev = getCellData(taskMap[`${client.id}:${prevMonth}`] ?? [], client);
                  showNextIndicator = prev.total > 0 && prev.completed === prev.total;
                }

                return (
                  <GanttCell
                    key={m}
                    tasks={cellTasks}
                    client={client}
                    isCurrentMonth={isCurrentMonth}
                    showNextIndicator={showNextIndicator}
                    onClick={() => onCellClick(client.id, m)}
                  />
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
