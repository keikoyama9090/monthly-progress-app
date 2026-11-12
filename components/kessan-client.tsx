"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Hourglass, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppNav, AppLogo, UserMenu } from "@/components/app-nav";
import { AssigneeBadge, cycleAssignee } from "@/components/ui/assignee-badge";
import { KessanCardSheet } from "@/components/kessan-card-sheet";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import {
  KESSAN_STAGES,
  KESSAN_STAGE_KEYS,
  allPaid,
  filingDeadline,
  periodLabel,
  previousMonthJST,
  shortDate,
  type KessanCard,
  type KessanStage,
} from "@/lib/kessan";

type Props = {
  initialCards: KessanCard[];
};

type Toast = { id: number; message: string; kind: "error" | "info" };

export function KessanClient({ initialCards }: Props) {
  const [cards, setCards] = useState<KessanCard[]>(initialCards);
  const [showDone, setShowDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seedMonth, setSeedMonth] = useState(() => {
    const { year, month } = previousMonthJST();
    return `${year}-${String(month).padStart(2, "0")}`;
  });
  const [seeding, setSeeding] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((message: string, kind: Toast["kind"] = "error") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch("/api/kessan", { cache: "no-store" });
    if (!res.ok) throw new Error();
    setCards(await res.json());
  }, []);

  const replaceCard = useCallback((updated: KessanCard) => {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  /** カードの部分更新（楽観更新→失敗したら元に戻す） */
  const patchCard = useCallback(
    async (card: KessanCard, patch: Record<string, unknown>, optimistic: Partial<KessanCard>) => {
      replaceCard({ ...card, ...optimistic });
      try {
        const res = await apiFetch(`/api/kessan/${card.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "更新に失敗しました。");
        replaceCard(data as KessanCard);
      } catch (err) {
        replaceCard(card);
        showToast(err instanceof Error ? err.message : "更新に失敗しました。");
      }
    },
    [replaceCard, showToast]
  );

  const moveCard = useCallback(
    (card: KessanCard, delta: number) => {
      const idx = KESSAN_STAGE_KEYS.indexOf(card.stage);
      const nextStage = KESSAN_STAGE_KEYS[idx + delta];
      if (!nextStage || nextStage === "done") return; // 完了はシートの「完了にする」から
      patchCard(card, { stage: nextStage }, { stage: nextStage });
    },
    [patchCard]
  );

  const handleSeed = useCallback(async () => {
    const [y, m] = seedMonth.split("-").map(Number);
    if (!y || !m) return;
    setSeeding(true);
    try {
      const res = await apiFetch("/api/kessan", {
        method: "POST",
        body: JSON.stringify({ year: y, month: m }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "投入に失敗しました。");
      await reload();
      showToast(
        data.inserted > 0
          ? `${m}月決算の${data.inserted}社を未着手に入れました。`
          : `${m}月決算で新しく入れる先はありませんでした。`,
        "info"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "投入に失敗しました。");
    } finally {
      setSeeding(false);
    }
  }, [seedMonth, reload, showToast]);

  const columns = useMemo(() => {
    const keys: KessanStage[] = [...KESSAN_STAGES.map((s) => s.key), ...(showDone ? (["done"] as const) : [])];
    return keys.map((key) => ({
      key,
      label: key === "done" ? "完了" : KESSAN_STAGES.find((s) => s.key === key)!.label,
      hint: key === "done" ? "直近90日" : KESSAN_STAGES.find((s) => s.key === key)!.hint,
      cards: cards.filter((c) => c.stage === key),
    }));
  }, [cards, showDone]);

  const doneCount = cards.filter((c) => c.stage === "done").length;
  const selectedCard = cards.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border shadow-sm z-20 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-6 py-0 flex items-stretch gap-6 h-12">
          <AppLogo />
          <AppNav active="kessan" />
          <div className="flex-1" />

          {/* 投入：決算月を選んで未着手に入れる */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">決算月</span>
            <input
              type="month"
              value={seedMonth}
              onChange={(e) => setSeedMonth(e.target.value)}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs tabular-nums"
            />
            <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding}>
              <Plus className="size-3.5" />
              未着手に投入
            </Button>
          </div>

          <div className="flex items-center">
            <Button size="sm" variant="ghost" onClick={() => setShowDone((v) => !v)}>
              {showDone ? "完了を隠す" : `完了を表示（${doneCount}）`}
            </Button>
          </div>

          <UserMenu />
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full overflow-x-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 h-full flex gap-3">
          {columns.map((col) => (
            <section
              key={col.key}
              className="w-60 shrink-0 flex flex-col h-full rounded-lg bg-muted/50 border border-border"
            >
              <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{col.cards.length}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{col.hint}</p>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 flex flex-col gap-2">
                {col.cards.map((card) => (
                  <BoardCard
                    key={card.id}
                    card={card}
                    onOpen={() => setSelectedId(card.id)}
                    onMove={(delta) => moveCard(card, delta)}
                    onCycleAction={() => {
                      const next = cycleAssignee(card.next_action);
                      patchCard(card, { next_action: next }, { next_action: next });
                    }}
                  />
                ))}
                {col.cards.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-6">なし</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-lg text-white px-4 py-3 text-sm shadow-lg max-w-sm",
              toast.kind === "error" ? "bg-red-600" : "bg-slate-800"
            )}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/80 hover:text-white"
              aria-label="閉じる"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <KessanCardSheet
        card={selectedCard}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onPatch={patchCard}
        onCommentAdded={(cardId, body, createdAt) =>
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId ? { ...c, latest_comment: body, latest_comment_at: createdAt } : c
            )
          )
        }
        onDeleted={(cardId) => {
          setSelectedId(null);
          setCards((prev) => prev.filter((c) => c.id !== cardId));
        }}
        onError={showToast}
      />
    </div>
  );
}

function BoardCard({
  card,
  onOpen,
  onMove,
  onCycleAction,
}: {
  card: KessanCard;
  onOpen: () => void;
  onMove: (delta: number) => void;
  onCycleAction: () => void;
}) {
  const idx = KESSAN_STAGE_KEYS.indexOf(card.stage);
  const isDone = card.stage === "done";
  const deadline = filingDeadline(card.period_end, card.extended);

  return (
    <div className="rounded-md bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
      <button onClick={onOpen} className="w-full text-left px-3 pt-2.5 pb-1.5">
        <div className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {card.client_name}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          <span>{periodLabel(card.period_end)}</span>
          <span>申告 {shortDate(deadline)}</span>
          {card.extended && (
            <span className="rounded bg-slate-100 px-1 text-slate-600">延長</span>
          )}
        </div>
        {card.latest_comment && (
          <p className="mt-1.5 text-xs text-foreground/80 line-clamp-2">{card.latest_comment}</p>
        )}
      </button>

      <div className="flex items-center gap-1.5 px-2 pb-2">
        <AssigneeBadge assignee={card.next_action} onClick={onCycleAction} disabled={isDone} />
        {card.waiting_since && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 ring-1 ring-amber-200">
            <Hourglass className="size-3" />
            資料待ち
          </span>
        )}
        {card.stage === "binding" && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] ring-1",
              allPaid(card)
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-muted text-muted-foreground ring-border"
            )}
          >
            納付 {[card.paid_corporate, card.paid_consumption, card.paid_local].filter(Boolean).length}/3
          </span>
        )}
        <div className="flex-1" />
        {!isDone && (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMove(-1)}
              disabled={idx <= 0}
              aria-label="前の列へ"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMove(1)}
              disabled={card.stage === "binding"}
              aria-label="次の列へ"
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
