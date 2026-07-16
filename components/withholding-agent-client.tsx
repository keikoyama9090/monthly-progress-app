"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WithholdingAgentTable } from "@/components/withholding-agent-table";
import { AppNav, AppLogo, UserMenu } from "@/components/app-nav";
import type { Client, WithholdingAgentTask } from "@/lib/types";

type Props = {
  initialClients: Client[];
  initialTasks: WithholdingAgentTask[];
  currentYear: number;
};

type Toast = { id: number; message: string };

export function WithholdingAgentClient({
  initialClients,
  initialTasks,
  currentYear,
}: Props) {
  const [year, setYear] = useState(currentYear);
  const [clients] = useState<Client[]>(
    [...initialClients].sort((a, b) => (a.fiscal_month ?? 13) - (b.fiscal_month ?? 13))
  );
  const [tasks, setTasks] = useState<WithholdingAgentTask[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const showError = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchYear = useCallback(async (y: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await fetch(`/api/withholding-agent-tasks?year=${y}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data: WithholdingAgentTask[] = await res.json();
      setTasks(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      showError("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleYearChange = useCallback((delta: number) => {
    const newYear = year + delta;
    setYear(newYear);
    fetchYear(newYear);
  }, [year, fetchYear]);

  const handleTaskUpdated = useCallback((updated: WithholdingAgentTask) => {
    setTasks((prev) => {
      const next = prev.filter(
        (t) => !(t.client_id === updated.client_id && t.year === updated.year && t.month === updated.month)
      );
      return [...next, updated];
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-0 flex items-stretch gap-6 h-12">
          <AppLogo />
          <AppNav active="withholding-agent" />
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleYearChange(-1)}
              disabled={loading}
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
              disabled={loading}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <UserMenu />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          クライアントマスタで「源泉税の納税代行」が「代行あり」のクライアントのみ表示しています(
          {clients.length}件)。
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            読み込み中...
          </div>
        ) : (
          <WithholdingAgentTable
            clients={clients}
            tasks={tasks}
            year={year}
            onTaskUpdated={handleTaskUpdated}
            onError={showError}
          />
        )}
      </main>

      {/* トースト */}
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
    </div>
  );
}
