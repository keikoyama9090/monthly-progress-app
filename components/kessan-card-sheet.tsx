"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, Hourglass, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AssigneeBadge, cycleAssignee } from "@/components/ui/assignee-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import {
  KESSAN_STAGES,
  KESSAN_STAGE_KEYS,
  BINDING_FIELDS,
  REVIEW_FIELDS,
  PAID_FIELDS,
  blockedByReview,
  canComplete,
  reviewDone,
  filingDeadline,
  periodLabel,
  shortDate,
  daysLabel,
  daysUntil,
  type KessanCard,
  type KessanComment,
  type KessanStage,
} from "@/lib/kessan";

type Props = {
  card: KessanCard | null;
  onOpenChange: (open: boolean) => void;
  onPatch: (card: KessanCard, patch: Record<string, unknown>, optimistic: Partial<KessanCard>) => void;
  onCommentAdded: (cardId: string, body: string, createdAt: string) => void;
  onDeleted: (cardId: string) => void;
  onError: (message: string) => void;
};

type CheckField = { key: keyof KessanCard; label: string };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 工程ごとのチェック項目 */
function checksForStage(stage: KessanStage): { title: string; fields: CheckField[] }[] {
  if (stage === "review") return [{ title: "社内レビュー", fields: [...REVIEW_FIELDS] }];
  if (stage === "binding")
    return [
      { title: "製本・送付", fields: [...BINDING_FIELDS] },
      { title: "納付確認", fields: [...PAID_FIELDS] },
    ];
  return [];
}

export function KessanCardSheet({ card, onOpenChange, onPatch, onCommentAdded, onDeleted, onError }: Props) {
  const [comments, setComments] = useState<KessanComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const cardId = card?.id ?? null;

  useEffect(() => {
    if (!cardId) return;
    setDraft("");
    setComments([]);
    setShowOther(false);
    setLoadingComments(true);
    const ctrl = new AbortController();
    fetch(`/api/kessan/${cardId}/comments`, { cache: "no-store", signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((rows: KessanComment[]) => setComments(rows))
      .catch((err) => {
        if (err?.name !== "AbortError") onError("コメントの読み込みに失敗しました。");
      })
      .finally(() => setLoadingComments(false));
    return () => ctrl.abort();
  }, [cardId, onError]);

  const addComment = async () => {
    if (!card) return;
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const res = await apiFetch(`/api/kessan/${card.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      const row = (await res.json()) as KessanComment;
      setComments((prev) => [row, ...prev]);
      onCommentAdded(card.id, row.body, row.created_at);
      setDraft("");
    } catch {
      onError("コメントの保存に失敗しました。");
    } finally {
      setPosting(false);
    }
  };

  const deleteCard = async () => {
    if (!card) return;
    if (!window.confirm(`${card.client_name}（${periodLabel(card.period_end)}）のカードを削除します。コメントも消えます。よろしいですか？`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/kessan/${card.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(card.id);
    } catch {
      onError("削除に失敗しました。");
    }
  };

  if (!card) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const stageIdx = KESSAN_STAGE_KEYS.indexOf(card.stage);
  const current = KESSAN_STAGES.find((s) => s.key === card.stage);
  const nextKey = KESSAN_STAGE_KEYS[stageIdx + 1] as KessanStage | undefined;
  const nextLabel = nextKey === "done" ? "完了" : KESSAN_STAGES.find((s) => s.key === nextKey)?.label;
  const currentChecks = checksForStage(card.stage);

  // 次へ進めない理由
  const nextBlockedReason =
    !nextKey
      ? null
      : card.stage === "review" && !reviewDone(card)
      ? "2つのチェックが揃うと進めます"
      : card.stage === "binding" && !canComplete(card)
      ? "5つのチェックが揃うと完了にできます"
      : null;

  // 今の工程以外のチェック（折りたたみ）
  const otherChecks = (["review", "binding"] as KessanStage[])
    .filter((s) => s !== card.stage)
    .flatMap((s) => checksForStage(s));

  const deadline = filingDeadline(card.period_end, card.extended);

  const renderCheck = (f: CheckField, big: boolean) => (
    <label
      key={f.key}
      className={cn(
        "flex items-center gap-2 cursor-pointer rounded-md",
        big && "px-3 py-2 bg-card border border-border hover:border-primary/40"
      )}
    >
      <Checkbox
        checked={card[f.key] as boolean}
        onCheckedChange={(checked) =>
          onPatch(card, { [f.key]: checked === true }, { [f.key]: checked === true } as Partial<KessanCard>)
        }
      />
      <span className={cn("text-sm", card[f.key] && "text-muted-foreground line-through")}>{f.label}</span>
    </label>
  );

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col gap-0 p-0 bg-background">
        {/* ヘッダー：会社・期・期限＋工程の進み具合 */}
        <SheetHeader className="border-b border-border px-5 pt-4 pb-3 space-y-0">
          <SheetTitle className="text-base font-semibold text-foreground pr-8">{card.client_name}</SheetTitle>
          <p className="text-xs text-foreground/60 tabular-nums">
            {periodLabel(card.period_end)}・申告期限 {shortDate(deadline)}（{daysLabel(daysUntil(deadline))}）
            {card.extended && "・延長"}
          </p>
          <ol className="mt-3 flex items-center gap-1" aria-label="工程">
            {KESSAN_STAGE_KEYS.map((key, i) => {
              const label = key === "done" ? "完了" : KESSAN_STAGES.find((s) => s.key === key)!.label;
              const blocked = blockedByReview(card, key) || key === "done" || card.stage === "done";
              return (
                <li key={key} className="flex-1">
                  <button
                    onClick={() => onPatch(card, { stage: key }, { stage: key })}
                    disabled={blocked || key === card.stage}
                    title={label}
                    className="w-full group disabled:cursor-default"
                  >
                    <div
                      className={cn(
                        "h-1.5 rounded-full",
                        i < stageIdx ? "bg-primary/50" : i === stageIdx ? "bg-primary" : "bg-muted"
                      )}
                    />
                    <div
                      className={cn(
                        "mt-1 text-[10px] leading-tight truncate",
                        i === stageIdx ? "text-primary font-semibold" : "text-muted-foreground",
                        !blocked && key !== card.stage && "group-hover:text-foreground"
                      )}
                    >
                      {label}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* 今の工程 */}
          {card.stage === "done" ? (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                <Check className="size-4" />
                完了しています
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => onPatch(card, { stage: "binding" }, { stage: "binding", completed_at: null })}
              >
                完了を取り消して製本に戻す
              </Button>
            </section>
          ) : (
            <section className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 flex flex-col gap-3">
              <div>
                <p className="text-[11px] font-semibold text-primary">今の工程</p>
                <h3 className="text-base font-semibold text-foreground">{current?.label}</h3>
              </div>

              {current && (
                <ol className="list-decimal pl-4 text-xs text-foreground/70 space-y-0.5">
                  {current.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}

              {currentChecks.map((group) => (
                <div key={group.title} className="flex flex-col gap-1.5">
                  {currentChecks.length > 1 && (
                    <p className="text-xs font-semibold text-foreground/70">{group.title}</p>
                  )}
                  {group.fields.map((f) => renderCheck(f, true))}
                </div>
              ))}

              {nextKey && (
                <div>
                  <Button
                    size="sm"
                    disabled={nextBlockedReason !== null}
                    onClick={() => onPatch(card, { stage: nextKey }, { stage: nextKey })}
                  >
                    {nextKey === "done" ? "完了にする" : `${nextLabel}へ進む`}
                    <ArrowRight className="size-3.5" />
                  </Button>
                  {nextBlockedReason && (
                    <p className="text-[11px] text-muted-foreground mt-1">{nextBlockedReason}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 進捗コメント */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-foreground/70">進捗コメント</h3>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addComment();
                  }
                }}
                maxLength={500}
                placeholder="例：固定資産台帳 依頼中／別表4まで完了"
                className="flex-1 h-8 rounded-md border border-border bg-background px-2.5 text-sm"
              />
              <Button size="sm" onClick={addComment} disabled={posting || draft.trim().length === 0}>
                追加
              </Button>
            </div>
            {loadingComments ? (
              <p className="text-xs text-muted-foreground py-1">読み込み中...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">まだコメントはありません</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {comments.map((c) => (
                  <li key={c.id} className="py-2">
                    <div className="text-[11px] text-muted-foreground tabular-nums">{formatDateTime(c.created_at)}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap break-words">{c.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 共通の設定（小さくまとめる） */}
          <section className="rounded-lg bg-muted/50 px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/70 w-24">次のアクション</span>
              <AssigneeBadge
                emptyLabel="＋"
                title="クリックで K → C → 客 → なし"
                assignee={card.next_action}
                onClick={() => {
                  const next = cycleAssignee(card.next_action);
                  onPatch(card, { next_action: next }, { next_action: next });
                }}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-xs text-foreground/70 w-24">資料待ち</span>
              <Checkbox
                checked={card.waiting_since !== null}
                onCheckedChange={(checked) =>
                  onPatch(
                    card,
                    { waiting: checked === true },
                    { waiting_since: checked === true ? new Date().toISOString() : null }
                  )
                }
              />
              {card.waiting_since && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                  <Hourglass className="size-3" />
                  {formatDateTime(card.waiting_since)}から
                </span>
              )}
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-xs text-foreground/70 w-24">申告期限の延長</span>
              <Checkbox
                checked={card.extended}
                onCheckedChange={(checked) =>
                  onPatch(card, { extended: checked === true }, { extended: checked === true })
                }
              />
            </label>
          </section>

          {/* ほかの工程のチェック（折りたたみ） */}
          {otherChecks.length > 0 && (
            <section>
              <button
                onClick={() => setShowOther((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("size-3.5 transition-transform", showOther && "rotate-180")} />
                ほかの工程のチェック
              </button>
              {showOther && (
                <div className="mt-2 flex flex-col gap-3">
                  {otherChecks.map((group) => (
                    <div key={group.title} className="flex flex-col gap-1.5">
                      <p className="text-xs text-foreground/70">{group.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {group.fields.map((f) => renderCheck(f, false))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 flex justify-end">
          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={deleteCard}>
            <Trash2 className="size-3.5" />
            カードを削除
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
