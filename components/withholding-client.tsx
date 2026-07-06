"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WithholdingTable } from "@/components/withholding-table";
import { AppNav, AppLogo, UserMenu } from "@/components/app-nav";
import type { Client, WithholdingTax, YearEndAdjustment } from "@/lib/types";

type Props = {
  initialClients: Client[];
  initialTaxes: WithholdingTax[];
  initialAdjustments: YearEndAdjustment[];
  currentYear: number;
};

type Toast = { id: number; message: string };

export function WithholdingClient({
  initialClients,
  initialTaxes,
  initialAdjustments,
  currentYear,
}: Props) {
  const [year, setYear] = useState(currentYear);
  const [clients] = useState<Client[]>(
    [...initialClients].sort((a, b) => (a.fiscal_month ?? 13) - (b.fiscal_month ?? 13))
  );
  const [taxes, setTaxes] = useState<WithholdingTax[]>(initialTaxes);
  const [adjustments, setAdjustments] = useState<YearEndAdjustment[]>(initialAdjustments);
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

  const fetchYear = useCallback(async (_y: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const [taxRes, adjRes] = await Promise.all([
        fetch(`/api/withholding/year?year=${_y}`, { signal: ctrl.signal, cache: "no-store" }),
        fetch(`/api/year-end-adjustment?year=${_y}`, { signal: ctrl.signal, cache: "no-store" }),
      ]);
      if (!taxRes.ok || !adjRes.ok) throw new Error();
      const [taxData, adjData] = await Promise.all([taxRes.json(), adjRes.json()]);
      setTaxes(taxData as WithholdingTax[]);
      setAdjustments(adjData as YearEndAdjustment[]);
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

  const handleTaxUpdated = useCallback((updated: WithholdingTax) => {
    setTaxes((prev) => {
      const next = prev.filter(
        (t) => !(t.client_id === updated.client_id && t.year === updated.year && t.month === updated.month)
      );
      return [...next, updated];
    });
  }, []);

  const handleAdjustmentUpdated = useCallback((updated: YearEndAdjustment) => {
    setAdjustments((prev) => {
      const next = prev.filter(
        (a) => !(a.client_id === updated.client_id && a.year === updated.year)
      );
      return [...next, updated];
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-0 flex items-stretch gap-6 h-12">
          <AppLogo />
          <AppNav active="withholding" />
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

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            読み込み中...
          </div>
        ) : (
          <WithholdingTable
            clients={clients}
            taxes={taxes}
            adjustments={adjustments}
            year={year}
            onTaxUpdated={handleTaxUpdated}
            onAdjustmentUpdated={handleAdjustmentUpdated}
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
