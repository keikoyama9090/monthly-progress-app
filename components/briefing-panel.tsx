"use client";

import type { BriefingItem } from "@/lib/briefing";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  items: BriefingItem[];
};

function priorityDotColor(priority: number) {
  if (priority === 1) return "bg-amber-500";
  return "bg-slate-400";
}

function buildSummaryText(items: BriefingItem[]) {
  const deadlineCount = items.filter((item) => item.deadlineText).length;
  const memoCount = items.filter((item) => item.memoHighlight).length;

  const parts: string[] = [];
  if (deadlineCount > 0) parts.push(`期限${deadlineCount}件`);
  if (memoCount > 0) parts.push(`メモ${memoCount}件`);

  return parts.length > 0 ? `（${parts.join("・")}）` : "";
}

export function BriefingPanel({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" />
          本日、特に対応が必要な項目はありません。
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-5 py-3 border-b border-border/60">
        <h2 className="text-sm font-semibold text-foreground">
          📋 本日の対応事項 {items.length}件
          <span className="ml-1 font-normal text-muted-foreground">{buildSummaryText(items)}</span>
        </h2>
      </div>

      <ul className="divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.clientId} className="flex items-start gap-3 px-5 py-3">
            <span
              className={cn("mt-1.5 size-2 rounded-full shrink-0", priorityDotColor(item.priority))}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{item.clientName}</p>
              {item.deadlineText && (
                <p className="text-xs text-muted-foreground">{item.deadlineText}</p>
              )}
              {item.memoHighlight && (
                <p className="text-xs text-muted-foreground">📝 {item.memoHighlight}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
