"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type AssigneeValue = "K" | "C" | "client" | null;

type Props = {
  assignee: AssigneeValue;
  onClick: () => void;
  disabled?: boolean;
  /** 未設定のときに表示する文字（既定は「―」） */
  emptyLabel?: string;
  /** マウスを乗せたときの説明 */
  title?: string;
};

const LABELS: Record<Exclude<AssigneeValue, null>, string> = { K: "K", C: "C", client: "客" };

export function AssigneeBadge({ assignee, onClick, disabled = false, emptyLabel = "―", title }: Props) {
  // キーボードでも操作できるようにする（Enter / Space）
  const a11y = disabled
    ? {}
    : {
        role: "button" as const,
        tabIndex: 0,
        "aria-label": `次のアクション: ${assignee ? LABELS[assignee] : "未設定"}${title ? `（${title}）` : ""}`,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      };
  const base =
    "inline-flex items-center justify-center rounded-md w-7 h-7 text-xs font-bold select-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

  const interactive = disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer";

  if (!assignee) {
    return (
      <span
        onClick={disabled ? undefined : onClick}
        title={title}
        {...a11y}
        className={cn(
          base,
          interactive,
          "border border-dashed border-border text-muted-foreground/50",
          !disabled && "hover:border-muted-foreground/50 hover:text-muted-foreground"
        )}
      >
        {emptyLabel}
      </span>
    );
  }

  const colors =
    assignee === "K"
      ? "bg-primary/10 text-primary ring-1 ring-primary/30" + (disabled ? "" : " hover:bg-primary/20")
      : assignee === "C"
      ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200" + (disabled ? "" : " hover:bg-violet-200")
      : "bg-rose-100 text-rose-700 ring-1 ring-rose-200" + (disabled ? "" : " hover:bg-rose-200");

  const label = assignee === "client" ? "客" : assignee;

  return (
    <span onClick={disabled ? undefined : onClick} title={title} {...a11y} className={cn(base, interactive, colors)}>
      {label}
    </span>
  );
}

export function cycleAssignee(current: AssigneeValue): AssigneeValue {
  return current === null ? "K" : current === "K" ? "C" : current === "C" ? "client" : null;
}
