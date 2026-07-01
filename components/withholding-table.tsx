"use client";

import { useState, Fragment } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { MONTHS } from "@/lib/constants";
import type { Client, WithholdingTax, YearEndAdjustment } from "@/lib/types";
import { WithholdingDetail } from "@/components/withholding-detail";
import { AssigneeBadge } from "@/components/ui/assignee-badge";
import { cn } from "@/lib/utils";

type Props = {
  clients: Client[];
  taxes: WithholdingTax[];
  adjustments: YearEndAdjustment[];
  year: number;
  onTaxUpdated: (t: WithholdingTax) => void;
  onAdjustmentUpdated: (a: YearEndAdjustment) => void;
  onError: (msg: string) => void;
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "─";
  return `¥${n.toLocaleString()}`;
}

function CarryoverBadge({ amount }: { amount: number | null }) {
  if (amount == null || amount === 0) return <span className="text-gray-300 text-xs">─</span>;
  return (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
      ▲{fmt(amount)}
    </span>
  );
}

function MonthCell({
  tax,
  isCurrentMonth,
}: {
  tax: WithholdingTax | undefined;
  isCurrentMonth: boolean;
}) {
  if (!tax) {
    return (
      <div
        className={cn(
          "w-12 h-9 flex items-center justify-center text-xs rounded select-none",
          isCurrentMonth ? "bg-blue-50 text-blue-300" : "bg-gray-50 text-gray-200"
        )}
      >
        ─
      </div>
    );
  }
  if (tax.paid) {
    return (
      <div className="w-12 h-9 flex items-center justify-center rounded bg-green-100 text-green-700 text-xs font-medium">
        <svg viewBox="0 0 12 12" className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,6 5,9 10,3" />
        </svg>
        済
      </div>
    );
  }
  return (
    <div
      className={cn(
        "w-12 h-9 flex items-center justify-center rounded text-xs",
        isCurrentMonth
          ? "bg-blue-50 border border-blue-200 text-blue-400"
          : "bg-gray-50 text-gray-300"
      )}
    >
      {tax.tax_amount != null ? fmt(tax.tax_amount).replace("¥", "") : "─"}
    </div>
  );
}

export function WithholdingTable({
  clients,
  taxes,
  adjustments,
  year,
  onTaxUpdated,
  onAdjustmentUpdated,
  onError,
}: Props) {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // クライアント × 月 のマップ
  const taxMap: Record<string, WithholdingTax | undefined> = {};
  for (const t of taxes) {
    taxMap[`${t.client_id}:${t.month}`] = t;
  }

  // 年末調整マップ
  const adjMap: Record<string, YearEndAdjustment | undefined> = {};
  for (const a of adjustments) {
    adjMap[a.client_id] = a;
  }

  // 繰越残高（前年の年末調整「還付」分）を表示するための計算
  // 今年の表示上は前年の year_end_adjustments を参照するが、
  // シンプル実装として adjustments にある当年データの還付額を表示する
  function getCarryover(clientId: string): number | null {
    const adj = adjMap[clientId];
    if (!adj || adj.adjustment_type !== "refund" || adj.amount === 0) return null;
    // 実際には前年の year_end_adjustments を参照すべきだが、
    // 初回実装として当年の還付残高を表示
    const totalPaid = taxes
      .filter((t) => t.client_id === clientId && t.paid && t.tax_amount != null)
      .reduce((sum, t) => sum + (t.tax_amount ?? 0), 0);
    const remaining = adj.amount - totalPaid;
    return remaining > 0 ? remaining : null;
  }

  function toggleExpand(clientId: string) {
    setExpandedClientId((prev) => (prev === clientId ? null : clientId));
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
            <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-200 w-28 min-w-[112px] text-right">
              繰越残高
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                className={cn(
                  "text-center px-1 py-2.5 font-semibold text-gray-600 border-r border-gray-100 w-14 min-w-[56px]",
                  year === currentYear && m === currentMonth && "bg-blue-50 text-blue-700"
                )}
              >
                {m}月
              </th>
            ))}
            <th className="px-3 py-2.5 font-semibold text-gray-600 w-32 min-w-[128px] text-right">
              年末調整
            </th>
            <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-14 min-w-[56px] text-xs">
              担当
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const carryover = getCarryover(client.id);
            const adj = adjMap[client.id];

            return (
              <Fragment key={client.id}>
                {/* メイン行 */}
                <tr
                  className={cn(
                    "border-b border-gray-100 transition-colors",
                    isExpanded ? "bg-blue-50/40" : "bg-white hover:bg-gray-50/50"
                  )}
                >
                  {/* 決算月 */}
                  <td className="border-r border-gray-100 px-1 py-2 text-center">
                    {client.fiscal_month != null ? (
                      <span className="text-xs text-gray-400 tabular-nums">{client.fiscal_month}月</span>
                    ) : (
                      <span className="text-gray-200 text-xs">─</span>
                    )}
                  </td>
                  {/* 会社名（展開ボタン付き） */}
                  <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-2 py-2">
                    <button
                      onClick={() => toggleExpand(client.id)}
                      className="flex items-center gap-1 w-full text-left text-sm font-medium text-gray-800 hover:text-blue-700 transition-colors group"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 flex-shrink-0 text-gray-400 transition-transform",
                          isExpanded && "rotate-90 text-blue-600"
                        )}
                      />
                      <Building2 className="size-4 text-muted-foreground/50 shrink-0" />
                      <div className="flex flex-col items-start min-w-0">
                        <span className="truncate max-w-[108px]">{client.name}</span>
                        {client.withholding_type && (
                          <span className={cn(
                            "text-[10px] font-medium rounded px-1 py-px leading-none mt-0.5",
                            client.withholding_type === "special"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {client.withholding_type === "special" ? "特例" : "原則"}
                          </span>
                        )}
                      </div>
                    </button>
                  </td>

                  {/* 繰越残高 */}
                  <td className="px-3 py-2 border-r border-gray-200 text-right">
                    <CarryoverBadge amount={carryover} />
                  </td>

                  {/* 月ごとのセル */}
                  {MONTHS.map((m) => {
                    const tax = taxMap[`${client.id}:${m}`];
                    const isCurrentMonth = year === currentYear && m === currentMonth;
                    return (
                      <td key={m} className="p-1 border-r border-gray-100 text-center">
                        <MonthCell tax={tax} isCurrentMonth={isCurrentMonth} />
                      </td>
                    );
                  })}

                  {/* 年末調整 */}
                  <td className="px-3 py-2 text-right">
                    {adj ? (
                      <span className={cn(
                        "text-xs font-medium rounded px-1.5 py-0.5",
                        adj.adjustment_type === "refund"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700"
                      )}>
                        {adj.adjustment_type === "refund" ? "▲" : "+"}{fmt(adj.amount)}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">─</span>
                    )}
                  </td>

                  {/* 担当者 */}
                  <td className="px-2 py-2 text-center">
                    <AssigneeBadge
                      assignee={client.withholding_assignee ?? null}
                      onClick={() => {}}
                      disabled
                    />
                  </td>
                </tr>

                {/* 展開行：インライン明細 */}
                {isExpanded && (
                  <tr key={`${client.id}-detail`} className="bg-blue-50/20 border-b border-gray-100">
                    <td colSpan={17} className="px-6 py-4">
                      <WithholdingDetail
                        client={client}
                        year={year}
                        taxes={taxes.filter((t) => t.client_id === client.id)}
                        adjustment={adj}
                        onTaxUpdated={onTaxUpdated}
                        onAdjustmentUpdated={onAdjustmentUpdated}
                        onError={onError}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* 凡例 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-5 rounded bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-medium">済</div>
          <span>納付済</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-5 rounded bg-blue-50 border border-blue-200 text-blue-400 flex items-center justify-center text-[10px]">─</div>
          <span>当月（未納付）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">▲</span>
          <span>還付超過残高</span>
        </div>
      </div>
    </div>
  );
}
