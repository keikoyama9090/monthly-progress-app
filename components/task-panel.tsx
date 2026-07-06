"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { TASKS } from "@/lib/constants";
import type { Assignee, Client, MonthlyTask } from "@/lib/types";
import {
  getDaysElapsed,
  getVisitStatus,
} from "@/lib/visit-utils";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { CalendarDays, AlertCircle, Pencil, Check } from "lucide-react";
import { AssigneeBadge } from "@/components/ui/assignee-badge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  month: number;
  year: number;
  tasks: MonthlyTask[];
  latestVisit: string | null;
  onTasksUpdated: (updatedTask: MonthlyTask) => void;
};

function TaskRow({
  index,
  taskName,
  task,
  assignee,
  onToggle,
  onMemoChange,
}: {
  index: number;
  taskName: string;
  task: MonthlyTask | null;
  assignee: Assignee;
  onToggle: (index: number) => void;
  onMemoChange: (index: number, value: string) => void;
}) {
  const isCompleted = !!task?.completed_at;
  const [ripple, setRipple] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  const handleToggle = () => {
    if (!isCompleted) {
      setRipple(true);
      setTimeout(() => setRipple(false), 500);
    }
    onToggle(index);
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer select-none",
        isCompleted
          ? "bg-emerald-50/60 border-emerald-200"
          : "bg-card border-border hover:border-muted-foreground/30 active:scale-[0.99]"
      )}
      onClick={handleToggle}
    >
      {/* リップルエフェクト */}
      {ripple && (
        <span
          className="pointer-events-none absolute inset-0 rounded-xl animate-ping"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
            animationDuration: "0.45s",
            animationIterationCount: "1",
          }}
        />
      )}

      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* カスタムチェック表示 */}
        <span
          className={cn(
            "shrink-0 flex items-center justify-center size-5 rounded-full border-2 transition-all duration-300",
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white scale-110"
              : "border-muted-foreground/30 bg-transparent"
          )}
        >
          {isCompleted && <Check className="size-3 stroke-[3]" />}
        </span>

        <span
          className={cn(
            "text-sm flex-1 font-medium transition-all duration-300",
            isCompleted ? "line-through text-muted-foreground" : "text-foreground"
          )}
        >
          {taskName}
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* メモアイコン（完了時のみ表示） */}
          {isCompleted && (
            <button
              onClick={() => setMemoOpen((v) => !v)}
              className={cn(
                "p-1 rounded-md transition-colors",
                memoOpen
                  ? "text-primary bg-primary/10"
                  : task?.memo
                  ? "text-amber-500 hover:bg-amber-50"
                  : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
              )}
              title="メモ"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          <AssigneeBadge
            assignee={assignee}
            onClick={() => {}}
            disabled
          />
        </div>
      </div>

      {/* メモ入力（展開） */}
      {memoOpen && isCompleted && (
        <div
          className="px-3.5 pb-3 -mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            type="text"
            value={task?.memo ?? ""}
            onChange={(e) => onMemoChange(index, (e.target as HTMLInputElement).value)}
            placeholder="メモ..."
            className="h-7 text-xs bg-white/80 border-emerald-200 focus-visible:ring-emerald-300"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

export function TaskPanel({
  open,
  onOpenChange,
  client,
  month,
  year,
  tasks,
  latestVisit,
  onTasksUpdated,
}: Props) {
  const [localTasks, setLocalTasks] = useState<MonthlyTask[]>(tasks);
  const memoTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    return () => {
      Object.values(memoTimers.current).forEach(clearTimeout);
    };
  }, []);

  if (!client) return null;

  const getTask = (index: number) =>
    localTasks.find((t) => t.task_index === index) ?? null;

  const upsertTask = async (
    index: number,
    patch: Partial<Pick<MonthlyTask, "memo">> & { completed?: boolean }
  ) => {
    const existing = getTask(index);

    const body = {
      client_id: client.id,
      year,
      month,
      task_index: index,
      completed: patch.completed ?? (existing?.completed_at !== null && existing?.completed_at !== undefined),
      memo: patch.memo !== undefined ? patch.memo : (existing?.memo ?? null),
    };

    const res = await apiFetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data: MonthlyTask = await res.json();
      setLocalTasks((prev) => {
        const next = prev.filter((t) => t.task_index !== index);
        return [...next, data];
      });
      onTasksUpdated(data);
    }
  };

  const toggleComplete = async (index: number) => {
    const existing = getTask(index);
    const isCompleted = !!existing?.completed_at;
    await upsertTask(index, { completed: !isCompleted });
  };

  const handleMemoChange = (index: number, value: string) => {
    setLocalTasks((prev) => {
      const existing = prev.find((t) => t.task_index === index);
      if (existing) {
        return prev.map((t) =>
          t.task_index === index ? { ...t, memo: value } : t
        );
      }
      return prev;
    });

    clearTimeout(memoTimers.current[index]);
    memoTimers.current[index] = setTimeout(() => {
      upsertTask(index, { memo: value });
    }, 800);
  };

  const days = getDaysElapsed(latestVisit ?? undefined);
  const visitStatus = getVisitStatus(days);

  const enabledTaskIndices = TASKS
    .map((_, i) => i)
    .filter((i) => client.enabled_tasks[i] !== false);

  const completedCount = enabledTaskIndices.filter((i) => !!getTask(i)?.completed_at).length;
  const totalCount = enabledTaskIndices.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col gap-0 p-0 bg-background">
        {/* ヘッダー */}
        <SheetHeader className="border-b border-border px-5 py-4 space-y-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold text-foreground truncate">
                {client.name}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{year}年{month}月</p>
            </div>
            {/* 進捗バッジ */}
            <span className={cn(
              "shrink-0 text-xs font-semibold px-2 py-1 rounded-full mt-0.5",
              completedCount === totalCount && totalCount > 0
                ? "bg-emerald-100 text-emerald-700"
                : completedCount > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-muted text-muted-foreground"
            )}>
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* プログレスバー */}
          {totalCount > 0 && (
            <div className="pt-3">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progressPct === 100 ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* 訪問情報 */}
          <div className="pt-2">
            {latestVisit ? (
              <div className="flex items-center gap-2">
                <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">最終訪問:</span>
                <span className="text-xs text-foreground font-medium">{latestVisit}</span>
                {days !== null && (visitStatus === "danger" || visitStatus === "warn") && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium",
                      visitStatus === "danger" && "bg-red-100 text-red-700",
                      visitStatus === "warn" && "bg-amber-100 text-amber-700",
                    )}
                  >
                    <AlertCircle className="size-3" />
                    {days}日経過
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CalendarDays className="size-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-xs text-muted-foreground/70">訪問記録なし</span>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* タスクリスト */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            タスク
          </h3>

          {enabledTaskIndices.length === 0 && (
            <p className="text-sm text-muted-foreground">有効なタスクがありません</p>
          )}

          {enabledTaskIndices.map((i) => (
            <TaskRow
              key={i}
              index={i}
              taskName={TASKS[i]}
              task={getTask(i)}
              assignee={client.task_assignees?.[i] ?? null}
              onToggle={toggleComplete}
              onMemoChange={handleMemoChange}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
