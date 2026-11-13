"use client";

import { useEffect, useState } from "react";
import { Hourglass, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AssigneeBadge, cycleAssignee } from "@/components/ui/assignee-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import {
  KESSAN_STAGES,
  BINDING_FIELDS,
  REVIEW_FIELDS,
  blockedByReview,
  PAID_FIELDS,
  canComplete,
  filingDeadline,
  periodLabel,
  shortDate,
  daysLabel,
  daysUntil,
  type KessanCard,
  type KessanComment,
} from "@/lib/kessan";

type Props = {
  card: KessanCard | null;
  onOpenChange: (open: boolean) => void;
  onPatch: (card: KessanCard, patch: Record<string, unknown>, optimistic: Partial<KessanCard>) => void;
  onCommentAdded: (cardId: string, body: string, createdAt: string) => void;
  onDeleted: (cardId: string) => void;
  onError: (message: string) => void;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KessanCardSheet({ card, onOpenChange, onPatch, onCommentAdded, onDeleted, onError }: Props) {
  const [comments, setComments] = useState<KessanComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const cardId = card?.id ?? null;

  useEffect(() => {
    if (!cardId) return;
    setDraft("");
    setComments([]);
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

  return (
    <Sheet open={card !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col gap-0 p-0 bg-background">
        {card && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4 space-y-0">
              <SheetTitle className="text-base font-semibold text-foreground pr-8">
                {card.client_name}
              </SheetTitle>
              <p className="text-xs text-muted-foreground tabular-nums">
                {periodLabel(card.period_end)}・申告期限 {shortDate(filingDeadline(card.period_end, card.extended))}（{daysLabel(daysUntil(filingDeadline(card.period_end, card.extended)))}）
              </p>
            </SheetHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {/* 列 */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">工程</h3>
                <div className="flex flex-wrap gap-1.5">
                  {KESSAN_STAGES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onPatch(card, { stage: s.key }, { stage: s.key })}
                      disabled={card.stage === "done" || blockedByReview(card, s.key)}
                      title={blockedByReview(card, s.key) ? "社内レビューの2つが揃うと進めます" : undefined}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs border transition-colors disabled:opacity-50",
                        card.stage === s.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* 次のアクション・資料待ち・延長 */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground w-24">次のアクション</span>
                  <AssigneeBadge
                    emptyLabel="＋"
                    title="クリックで K → C → 客 → なし"
                    assignee={card.next_action}
                    onClick={() => {
                      const next = cycleAssignee(card.next_action);
                      onPatch(card, { next_action: next }, { next_action: next });
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground">クリックで K → C → 客 → なし</span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className="text-xs font-semibold text-muted-foreground w-24">資料待ち</span>
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
                  <span className="text-xs font-semibold text-muted-foreground w-24">申告期限の延長</span>
                  <Checkbox
                    checked={card.extended}
                    onCheckedChange={(checked) =>
                      onPatch(card, { extended: checked === true }, { extended: checked === true })
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">ありにすると期限が1か月後ろへ</span>
                </label>
              </section>

              {/* 社内レビュー */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">社内レビュー</h3>
                <div className="flex flex-col gap-2">
                  {REVIEW_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={card[f.key]}
                        onCheckedChange={(checked) =>
                          onPatch(card, { [f.key]: checked === true }, { [f.key]: checked === true })
                        }
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  2つ揃うと「クライアント報告」へ進めます。
                </p>
              </section>

              {/* 製本・送付 */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">製本・送付</h3>
                <div className="flex items-center gap-4">
                  {BINDING_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={card[f.key]}
                        onCheckedChange={(checked) =>
                          onPatch(card, { [f.key]: checked === true }, { [f.key]: checked === true })
                        }
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </section>

              {/* 納付確認・完了 */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">納付確認</h3>
                <div className="flex items-center gap-4">
                  {PAID_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={card[f.key]}
                        onCheckedChange={(checked) =>
                          onPatch(card, { [f.key]: checked === true }, { [f.key]: checked === true })
                        }
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  {card.stage === "done" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPatch(card, { stage: "binding" }, { stage: "binding", completed_at: null })}
                    >
                      完了を取り消して製本に戻す
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onPatch(card, { stage: "done" }, { stage: "done" })}
                      disabled={!canComplete(card)}
                    >
                      完了にする
                    </Button>
                  )}
                  {card.stage !== "done" && !canComplete(card) && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      製本列にあり、データ送付・製本郵送・納付確認3つの5つが揃うと完了にできます。
                    </p>
                  )}
                </div>
              </section>

              {/* コメント履歴 */}
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground">進捗コメント</h3>
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
                  <p className="text-xs text-muted-foreground py-2">読み込み中...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 py-2">まだコメントはありません</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {comments.map((c) => (
                      <li key={c.id} className="py-2">
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {formatDateTime(c.created_at)}
                        </div>
                        <div className="text-sm text-foreground whitespace-pre-wrap break-words">{c.body}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="border-t border-border px-5 py-3 flex justify-end">
              <Button size="sm" variant="destructive" onClick={deleteCard}>
                <Trash2 className="size-3.5" />
                カードを削除
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
