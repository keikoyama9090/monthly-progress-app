"use client";

import { cn } from "@/lib/utils";

type AssigneeValue = "K" | "C" | null;

type Props = {
  assignee: AssigneeValue;
  onClick: () => void;
  disabled?: boolean;
};

export function AssigneeBadge({ assignee, onClick, disabled = false }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md w-7 h-7 text-xs font-bold select-none transition-all";

  const interactive = disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer";

  if (!assignee) {
    return (
      <span
        onClick={disabled ? undefined : onClick}
        className={cn(
          base,
          interactive,
          "border border-dashed border-border text-muted-foreground/50",
          !disabled && "hover:border-muted-foreground/50 hover:text-muted-foreground"
        )}
      >
        ―
      </span>
    );
  }

  const colors =
    assignee === "K"
      ? "bg-primary/10 text-primary ring-1 ring-primary/30" + (disabled ? "" : " hover:bg-primary/20")
      : "bg-violet-100 text-violet-700 ring-1 ring-violet-200" + (disabled ? "" : " hover:bg-violet-200");

  return (
    <span onClick={disabled ? undefined : onClick} className={cn(base, interactive, colors)}>
      {assignee}
    </span>
  );
}

export function cycleAssignee(current: AssigneeValue): AssigneeValue {
  return current === null ? "K" : current === "K" ? "C" : null;
}
