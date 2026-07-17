"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Client, MonthlyTask, SelectedCell } from "@/lib/types";
import { GanttTable } from "@/components/gantt-table";
import { TaskPanel } from "@/components/task-panel";
import { BriefingPanel } from "@/components/briefing-panel";
import { AppNav, AppLogo, UserMenu } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { buildBriefingItems, getTargetMonth } from "@/lib/briefing";

type Props = {
  initialClients: Client[];
  initialTasks: MonthlyTask[];
  initialTargetMonthTasks: MonthlyTask[];
  initialLatestVisits: Record<string, string>;
  currentYear: number;
};

type Toast = { id: number; message: string };

export function HomeClient({
  initialClients,
  initialTasks,
  initialTargetMonthTasks,
  initialLatestVisits,
  currentYear,
}: Props) {
  const [year, setYear] = useState(currentYear);
  const [clients] = useState<Client[]>(
    [...initialClients].sort((a, b) => (a.fiscal_month ?? 13) - (b.fiscal_month ?? 13))
  );
  const [tasks, setTasks] = useState<MonthlyTask[]>(initialTasks);
  // ブリーフィングパネルは「先月分（report_day までに終えるべき対象月）」の
  // 実データを、年度ナビゲーションの影響を受けずに常に参照する
  const [targetMonthTasks, setTargetMonthTasks] = useState<MonthlyTask[]>(initialTargetMonthTasks);
  const targetMonth = useMemo(() => getTargetMonth(new Date()), []);
  const [latestVisits, setLatestVisits] =
    useState<Record<string, string>>(initialLatestVisits);

  useEffect(() => {
    fetch("/api/latest-visits", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { client_id: string; visited_on: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const map: Record<string, string> = {};
        for (const row of data) map[row.client_id] = row.visited_on;
        setLatestVisits(map);
      })
      .catch(() => {});
  }, []);
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const showError = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchTasks = useCallback(async (y: number) => {
    // 前のリクエストをキャンセルしてレースコンディションを防ぐ (E-07)
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setTasksLoading(true);
    try {
      const res = await fetch(`/api/tasks/year?year=${y}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error();
      const data: MonthlyTask[] = await res.json();
      setTasks(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      showError("タスクの読み込みに失敗しました。ページを再読み込みしてください。");
    } finally {
      setTasksLoading(false);
    }
  }, [showError]);

  // unmount 時に進行中リクエストをキャンセル
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleVisitSaved = useCallback((clientId: string, visitedOn: string) => {
    setLatestVisits((prev) => ({ ...prev, [clientId]: visitedOn }));
  }, []);

  const handleYearChange = useCallback(
    (delta: number) => {
      const newYear = year + delta;
      setYear(newYear);
      fetchTasks(newYear);
    },
    [year, fetchTasks]
  );

  // 1件のタスク更新をガントテーブルに反映させる（全件再取得を廃止）(E-04)
  const handleTaskUpdated = useCallback((updatedTask: MonthlyTask) => {
    setTasks((prev) => {
      const next = prev.filter(
        (t) => !(t.client_id === updatedTask.client_id && t.year === updatedTask.year && t.month === updatedTask.month && t.task_index === updatedTask.task_index)
      );
      return [...next, updatedTask];
    });
    if (updatedTask.year === targetMonth.year && updatedTask.month === targetMonth.month) {
      setTargetMonthTasks((prev) => {
        const next = prev.filter(
          (t) => !(t.client_id === updatedTask.client_id && t.year === updatedTask.year && t.month === updatedTask.month && t.task_index === updatedTask.task_index)
        );
        return [...next, updatedTask];
      });
    }
  }, [targetMonth]);

  const briefingItems = useMemo(
    () => buildBriefingItems(clients, targetMonthTasks, latestVisits),
    [clients, targetMonthTasks, latestVisits]
  );

  const selectedClient = selectedCell
    ? clients.find((c) => c.id === selectedCell.clientId) ?? null
    : null;

  const selectedTasks = selectedCell
    ? tasks.filter(
        (t) =>
          t.client_id === selectedCell.clientId &&
          t.month === selectedCell.month
      )
    : [];

  const selectedLatestVisit = selectedCell
    ? latestVisits[selectedCell.clientId] ?? null
    : null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border shadow-sm z-20 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-6 py-0 flex items-stretch gap-6 h-12">
          <AppLogo />
          <AppNav active="home" />

          <div className="flex-1" />

          {/* 年切り替え */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleYearChange(-1)}
              disabled={tasksLoading}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground w-16 text-center tabular-nums">
              {year}年度
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleYearChange(1)}
              disabled={tasksLoading}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <UserMenu />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 flex-1 min-h-0 w-full overflow-hidden">
        <div className="flex gap-6 h-full">
          <div className="flex-1 min-w-0 h-full">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
              <GanttTable
                clients={clients}
                tasks={tasks}
                latestVisits={latestVisits}
                year={year}
                onCellClick={(clientId, month) =>
                  setSelectedCell({ clientId, month })
                }
                onVisitSaved={handleVisitSaved}
              />
            )}
          </div>

          <div className="w-80 shrink-0 h-full overflow-y-auto">
            <BriefingPanel items={briefingItems} />
          </div>
        </div>
      </main>

      {/* トースト通知エリア (F-10) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-lg bg-red-600 text-white px-4 py-3 text-sm shadow-lg max-w-sm"
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-white/80 hover:text-white"
              aria-label="閉じる"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <TaskPanel
        open={selectedCell !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCell(null);
        }}
        client={selectedClient}
        month={selectedCell?.month ?? 1}
        year={year}
        tasks={selectedTasks}
        latestVisit={selectedLatestVisit}
        onTasksUpdated={handleTaskUpdated}
      />
    </div>
  );
}
