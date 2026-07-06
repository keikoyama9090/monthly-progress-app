"use client";

import type { BriefingItem } from "@/lib/briefing";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  items: BriefingItem[];
};

function priorityDotColor(priority: number) {
  if (priority === 1) return "bg-red-500";
  if (priority === 2) return "bg-amber-500";
  if (priority === 3) return "bg-amber-400";
  return "bg-slate-400";
}

export function BriefingPanel({ items }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
        <h2 className="text-sm font-semibold text-foreground">📋 今日のブリーフィング</h2>
        <span className="text-[11px] text-muted-foreground">
          {items.length > 0 ? `${items.length}件` : "対応事項なし"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" />
          本日、特に対応が必要な項目はありません。
        </div>
      ) : (
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
                {item.visitText && (
                  <p className="text-xs text-muted-foreground">{item.visitText}</p>
                )}
                {item.memoHighlight && (
                  <p className="text-xs text-muted-foreground">📝 {item.memoHighlight}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
