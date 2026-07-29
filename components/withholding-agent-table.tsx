"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, MessageSquare } from "lucide-react";
import { MONTHS } from "@/lib/constants";
import type { Client, WithholdingAgentTask } from "@/lib/types";
import { AssigneeBadge } from "@/components/ui/assignee-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

type Props = {
  clients: Client[];
  tasks: WithholdingAgentTask[];
  year: number;
  onTaskUpdated: (t: WithholdingAgentTask) => void;
  onError: (msg: string) => void;
};

// 特例（納期の特例）は 1〜6月分を7月に、7〜12月分を翌1月にまとめて納付するため、
// チェック対象となるのは 1月・7月のみ
const SPECIAL_ACTIVE_MONTHS = [1, 7];

function isMonthActive(client: Client, month: number): boolean {
  if (client.withholding_type !== "special") return true;
  return SPECIAL_ACTIVE_MONTHS.includes(month);
}

function MonthCell({
  task,
  isCurrentMonth,
  active,
  saving,
  onClick,
  onCommentSave,
}: {
  task: WithholdingAgentTask | undefined;
  isCurrentMonth: boolean;
  active: boolean;
  saving: boolean;
  onClick: () => void;
  onCommentSave: (value: string) => void;
}) {
  const isDone = !!task?.completed_at;
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState(task?.comment ?? "");
  const commentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCommentDraft(task?.comment ?? "");
  }, [task?.comment]);

  useEffect(() => {
    return () => {
      if (commentTimer.current) clearTimeout(commentTimer.current);
    };
  }, []);

  if (!active) {
    return (
      <div className="w-12 h-9 flex items-center justify-center rounded text-xs bg-gray-100 text-gray-300 select-none">
        ─
      </div>
    );
  }

  const handleCommentChange = (value: string) => {
    setCommentDraft(value);
    if (commentTimer.current) clearTimeout(commentTimer.current);
    commentTimer.current = setTimeout(() => onCommentSave(value), 600);
  };

  return (
    <div className="group relative w-12 h-9">
      <button
        onClick={onClick}
        disabled={saving}
        className={cn(
          "w-12 h-9 flex items-center justify-center rounded text-xs font-medium transition-colors select-none disabled:opacity-50",
          isDone
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : isCurrentMonth
            ? "bg-blue-50 border border-blue-200 text-blue-300 hover:bg-blue-100"
            : "bg-gray-50 text-gray-300 hover:bg-gray-100"
        )}
      >
        {isDone && <Check className="size-3.5 stroke-[3]" />}
      </button>

      <Popover open={commentOpen} onOpenChange={setCommentOpen}>
        <PopoverTrigger
          onClick={(e) => e.stopPropagation()}
          title="コメント"
          className={cn(
            "absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 rounded-full transition-colors",
            task?.comment
              ? "bg-amber-400 text-white"
              : "bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-300"
          )}
        >
          <MessageSquare className="size-2.5" />
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={commentDraft}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="コメント..."
            rows={3}
            autoFocus
            className="w-full min-w-0 rounded-md border border-input bg-transparent px-2 py-1.5 text-xs outline-none resize-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function WithholdingAgentTable({
  clients,
  tasks,
  year,
  onTaskUpdated,
  onError,
}: Props) {
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const taskMap: Record<string, WithholdingAgentTask | undefined> = {};
  for (const t of tasks) {
    taskMap[`${t.client_id}:${t.month}`] = t;
  }

  async function toggleCell(client: Client, month: number) {
    const key = `${client.id}:${month}`;
    const existing = taskMap[key];
    const nextCompleted = !existing?.completed_at;

    setSavingKey(key);
    try {
      const res = await apiFetch("/api/withholding-agent-tasks", {
        method: "POST",
        body: JSON.stringify({ client_id: client.id, year, month, completed: nextCompleted }),
      });
      if (res.ok) {
        const data: WithholdingAgentTask = await res.json();
        onTaskUpdated(data);
      } else {
        onError(`更新に失敗しました(エラーコード: ${res.status})。再度ログインしてからお試しください。`);
      }
    } catch {
      onError("通信エラーが発生しました。ネットワーク状態を確認してください。");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveComment(client: Client, month: number, comment: string) {
    try {
      const res = await apiFetch("/api/withholding-agent-tasks", {
        method: "POST",
        body: JSON.stringify({ client_id: client.id, year, month, comment }),
      });
      if (res.ok) {
        const data: WithholdingAgentTask = await res.json();
        onTaskUpdated(data);
      } else {
        onError(`コメントの保存に失敗しました(エラーコード: ${res.status})。`);
      }
    } catch {
      onError("通信エラーが発生しました。ネットワーク状態を確認してください。");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="border-collapse text-sm w-full" style={{ minWidth: "900px" }}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-center px-2 py-2.5 font-semibold text-gray-500 border-r border-gray-100 w-10 min-w-[40px] text-xs">
              決算
            </th>
            <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-200 w-36 min-w-[144px]">
              会社名
            </th>
            {MONTHS.map((m) => {
              const sourceMonth = m === 1 ? 12 : m - 1;
              return (
                <th
                  key={m}
                  className={cn(
                    "text-center px-1 py-1.5 font-semibold text-gray-600 border-r border-gray-100 w-14 min-w-[56px]",
                    year === currentYear && m === currentMonth && "bg-blue-50 text-blue-700"
                  )}
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span>{m}月</span>
                    <span className="text-[10px] font-normal text-gray-400">{sourceMonth}月分</span>
                  </div>
                </th>
              );
            })}
            <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-14 min-w-[56px] text-xs">
              担当
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan={15} className="px-4 py-8 text-center text-sm text-muted-foreground">
                「源泉税の納税代行」が「代行あり」のクライアントがいません。
              </td>
            </tr>
          ) : (
            clients.map((client) => (
              <tr
                key={client.id}
                className="border-b border-gray-100 bg-white hover:bg-gray-50/50 transition-colors"
              >
                {/* 決算月 */}
                <td className="border-r border-gray-100 px-1 py-2 text-center">
                  {client.fiscal_month != null ? (
                    <span className="text-xs text-gray-400 tabular-nums">{client.fiscal_month}月</span>
                  ) : (
                    <span className="text-gray-200 text-xs">─</span>
                  )}
                </td>
                {/* 会社名 */}
                <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-2 py-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <Building2 className="size-4 text-muted-foreground/50 shrink-0" />
                    <span className="truncate max-w-[92px]">{client.name}</span>
                    {client.withholding_type && (
                      <span className={cn(
                        "text-[10px] font-medium rounded px-1 py-px leading-none shrink-0",
                        client.withholding_type === "special"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {client.withholding_type === "special" ? "特例" : "原則"}
                      </span>
                    )}
                  </div>
                </td>

                {/* 月ごとのセル */}
                {MONTHS.map((m) => {
                  const key = `${client.id}:${m}`;
                  const isCurrentMonth = year === currentYear && m === currentMonth;
                  return (
                    <td key={m} className="p-1 border-r border-gray-100 text-center">
                      <MonthCell
                        task={taskMap[key]}
                        isCurrentMonth={isCurrentMonth}
                        active={isMonthActive(client, m)}
                        saving={savingKey === key}
                        onClick={() => toggleCell(client, m)}
                        onCommentSave={(value) => saveComment(client, m, value)}
                      />
                    </td>
                  );
                })}

                {/* 担当者 */}
                <td className="px-2 py-2 text-center">
                  <AssigneeBadge
                    assignee={client.withholding_assignee ?? null}
                    onClick={() => {}}
                    disabled
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 凡例 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Check className="size-3 stroke-[3]" />
          </div>
          <span>対応済(クリックで解除)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-5 rounded bg-blue-50 border border-blue-200" />
          <span>当月(未対応)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-5 rounded bg-gray-100 text-gray-300 flex items-center justify-center text-[10px]">─</div>
          <span>特例のため対象外(1月・7月のみチェック可)</span>
        </div>
      </div>
    </div>
  );
}
