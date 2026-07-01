"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-fetch";

type QuickSaveProps = {
  clientId: string;
  onSaved: (clientId: string, visitedOn: string) => void;
};

type EditProps = {
  clientId: string;
  children: React.ReactNode;
  initialDate?: string;
  onSaved: (clientId: string, visitedOn: string) => void;
};

async function saveVisit(clientId: string, date: string): Promise<boolean> {
  try {
    const res = await apiFetch("/api/visits", {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, visited_on: date }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** + ボタン：ワンタップで今日の日付を即保存 */
export function VisitQuickSave({ clientId, onSaved }: QuickSaveProps) {
  const [saving, setSaving] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const ok = await saveVisit(clientId, today);
    setSaving(false);
    if (ok) onSaved(clientId, today);
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
      aria-label="今日の訪問を記録"
    >
      {saving ? (
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="2" x2="6" y2="10" />
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      )}
    </button>
  );
}

/** バッジ（38日など）：タップで日付変更ポップオーバーを開く */
export function VisitPopover({ clientId, children, initialDate, onSaved }: EditProps) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [date, setDate] = useState(initialDate ?? today);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    setError(null);
    const ok = await saveVisit(clientId, date);
    setSaving(false);
    if (!ok) {
      setError("保存に失敗しました");
      return;
    }
    setOpen(false);
    onSaved(clientId, date);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDate(initialDate ?? today);
      }}
    >
      <PopoverTrigger
        className="cursor-pointer focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          訪問日を修正
        </p>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate((e.target as HTMLInputElement).value)}
          className="mb-3 text-sm"
        />
        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}
        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={saving || !date}
        >
          {saving ? "保存中..." : "保存"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
