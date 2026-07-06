"use client";

import { useState, useCallback } from "react";
import { Building2, ChevronRight } from "lucide-react";
import type { Client, Assignee } from "@/lib/types";
import { TASKS } from "@/lib/constants";
import { AssigneeBadge, cycleAssignee } from "@/components/ui/assignee-badge";
import { AppNav, AppLogo, UserMenu } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

type Props = {
  initialClients: Client[];
};

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12] as const;
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function withholdingLabel(type: Client["withholding_type"]) {
  if (type === "standard") return "原則";
  if (type === "special") return "特例";
  return "未設定";
}


function reportLabel(day: number | null) {
  return day != null ? `${day}日` : "未設定";
}

function entityLabel(type: Client["entity_type"]) {
  if (type === "corporate") return "法人";
  if (type === "individual") return "個人";
  return null;
}

export function ClientsClient({ initialClients }: Props) {
  const [clients, setClients] = useState<Client[]>(
    [...initialClients].sort((a, b) => {
      const am = a.fiscal_month ?? 13;
      const bm = b.fiscal_month ?? 13;
      return am - bm;
    })
  );
  const [selected, setSelected] = useState<Client | null>(null);
  const [draft, setDraft] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  const openPanel = useCallback((client: Client) => {
    setSelected(client);
    setDraft({ ...client });
  }, []);

  const closePanel = useCallback(() => {
    setSelected(null);
    setDraft(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/clients", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c.id === draft.id ? draft : c))
        );
        closePanel();
      }
    } finally {
      setSaving(false);
    }
  }, [draft, closePanel]);

  const update = useCallback(<K extends keyof Client>(key: K, value: Client[K]) => {
    setDraft((prev) => prev ? { ...prev, [key]: value } : prev);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-0 flex items-stretch gap-6 h-12">
          <AppLogo />
          <AppNav active="clients" />
          <div className="flex-1" />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-border shadow-sm bg-card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">決算月</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">会社名</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">区分</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">業種</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">報告期限</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">源泉税</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">納税代行</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">訪問不要</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">月次タスク</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client, idx) => (
                <tr
                  key={client.id}
                  className={cn(
                    "border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer",
                    idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                  )}
                  onClick={() => openPanel(client)}
                >
                  <td className="px-4 py-3 text-center">
                    {client.fiscal_month != null
                      ? <span className="text-foreground">{client.fiscal_month}月</span>
                      : <span className="text-muted-foreground/40">未設定</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground/50 shrink-0" />
                      <span className="font-medium text-foreground">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entityLabel(client.entity_type) ? (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        client.entity_type === "corporate"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      )}>
                        {entityLabel(client.entity_type)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">未設定</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {client.industry ?? <span className="text-muted-foreground/40">未設定</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.report_day != null
                      ? <span className="text-foreground">{client.report_day}日</span>
                      : <span className="text-muted-foreground/40">未設定</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.withholding_type != null ? (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        client.withholding_type === "special"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {withholdingLabel(client.withholding_type)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">未設定</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.tax_agent ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        代行あり
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">なし</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.no_visit ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        訪問不要
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">─</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {TASKS.map((task, i) => (
                        <span
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            client.enabled_tasks[i] ? "bg-foreground/40" : "bg-muted/60"
                          )}
                          title={task}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground/40">
                    <ChevronRight className="size-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 編集スライドパネル */}
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) closePanel(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-base font-semibold">クライアント編集</SheetTitle>
          </SheetHeader>

          {draft && (
            <div className="flex flex-col gap-6 px-4 pb-4">
              {/* 会社名 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">会社名</label>
                <Input
                  value={draft.name}
                  onChange={(e) => update("name", (e.target as HTMLInputElement).value)}
                  className="text-sm"
                />
              </div>

              {/* 区分（法人/個人） */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">区分</label>
                <div className="flex gap-2">
                  {([null, "corporate", "individual"] as const).map((type) => (
                    <button
                      key={String(type)}
                      onClick={() => update("entity_type", type)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors border",
                        draft.entity_type === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-foreground border-transparent hover:bg-muted"
                      )}
                    >
                      {type === null ? "未設定" : type === "corporate" ? "法人" : "個人"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 業種 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">業種</label>
                <Input
                  value={draft.industry ?? ""}
                  onChange={(e) => update("industry", (e.target as HTMLInputElement).value || null)}
                  placeholder="例：小売業、製造業"
                  className="text-sm"
                />
              </div>

              {/* 決算月 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">決算月</label>
                <div className="grid grid-cols-6 gap-1">
                  {MONTHS.map((m) => (
                    <button
                      key={m}
                      onClick={() => update("fiscal_month", draft.fiscal_month === m ? null : m)}
                      className={cn(
                        "rounded-md py-1.5 text-xs font-medium transition-colors",
                        draft.fiscal_month === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-foreground hover:bg-muted"
                      )}
                    >
                      {m}月
                    </button>
                  ))}
                </div>
              </div>

              {/* 毎月の報告期限日 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">毎月の報告期限日</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => update("report_day", draft.report_day === d ? null : d)}
                      className={cn(
                        "rounded-md py-1.5 text-xs font-medium transition-colors",
                        draft.report_day === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-foreground hover:bg-muted"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/60">現在: {reportLabel(draft.report_day)}</p>
              </div>

              {/* 源泉税納税方法 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">源泉税納税方法</label>
                <div className="flex gap-2">
                  {([null, "standard", "special"] as const).map((type) => (
                    <button
                      key={String(type)}
                      onClick={() => update("withholding_type", type)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors border",
                        draft.withholding_type === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-foreground border-transparent hover:bg-muted"
                      )}
                    >
                      {type === null ? "未設定" : type === "standard" ? "原則" : "特例"}
                    </button>
                  ))}
                </div>
                {draft.withholding_type === "special" && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    特例：1〜6月分を7月10日、7〜12月分を1月20日に一括納付
                  </p>
                )}
              </div>

              {/* 源泉税の納税代行 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">源泉税の納税代行</label>
                <div className="flex gap-2">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => update("tax_agent", val)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors border",
                        draft.tax_agent === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-foreground border-transparent hover:bg-muted"
                      )}
                    >
                      {val ? "代行あり" : "代行なし"}
                    </button>
                  ))}
                </div>
                {draft.tax_agent && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    当事務所が源泉税の納付手続きを代行します
                  </p>
                )}
              </div>

              {/* 訪問不要 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">訪問不要</label>
                <div className="flex gap-2">
                  {([false, true] as const).map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => update("no_visit", val)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors border",
                        draft.no_visit === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-foreground border-transparent hover:bg-muted"
                      )}
                    >
                      {val ? "訪問不要" : "訪問あり"}
                    </button>
                  ))}
                </div>
                {draft.no_visit && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    月次進捗の訪問管理から除外されます
                  </p>
                )}
              </div>

              {/* 月次タスク有効/無効 & 担当者 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">月次タスク</label>
                <div className="flex flex-col gap-1.5">
                  {TASKS.map((task, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        draft.enabled_tasks[i]
                          ? "bg-foreground/5 text-foreground"
                          : "bg-muted/30 text-muted-foreground/50"
                      )}
                    >
                      <button
                        onClick={() => {
                          const next = [...draft.enabled_tasks];
                          next[i] = !next[i];
                          update("enabled_tasks", next);
                        }}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                          draft.enabled_tasks[i] ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {draft.enabled_tasks[i] && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </span>
                        {task}
                      </button>
                      <AssigneeBadge
                        assignee={(draft.task_assignees?.[i] ?? null) as Assignee}
                        onClick={() => {
                          const next = [...(draft.task_assignees ?? [null, null, null, null, null])];
                          next[i] = cycleAssignee(next[i] as Assignee);
                          update("task_assignees", next);
                        }}
                        disabled={!draft.enabled_tasks[i]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 源泉税担当者 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">源泉税納付 担当者</label>
                <div className="flex items-center gap-3">
                  <AssigneeBadge
                    assignee={(draft.withholding_assignee ?? null) as Assignee}
                    onClick={() => {
                      update("withholding_assignee", cycleAssignee(draft.withholding_assignee ?? null));
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {draft.withholding_assignee === "K"
                      ? "K が担当"
                      : draft.withholding_assignee === "C"
                      ? "C が担当"
                      : draft.withholding_assignee === "client"
                      ? "クライアント対応待ち"
                      : "未設定"}
                  </span>
                </div>
              </div>

              {/* 保存ボタン */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
