"use client";

import { useState, useRef } from "react";
import { MONTHS } from "@/lib/constants";
import type { Client, WithholdingTax, YearEndAdjustment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AssigneeBadge } from "@/components/ui/assignee-badge";

type Props = {
  client: Client;
  year: number;
  taxes: WithholdingTax[];
  adjustment: YearEndAdjustment | undefined;
  onTaxUpdated: (t: WithholdingTax) => void;
  onAdjustmentUpdated: (a: YearEndAdjustment) => void;
  onError: (msg: string) => void;
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "─";
  return `¥${n.toLocaleString()}`;
}

type TaxRow = {
  salaryStr: string;
  feeStr: string;
};

export function WithholdingDetail({
  client,
  year,
  taxes,
  adjustment,
  onTaxUpdated,
  onAdjustmentUpdated,
  onError,
}: Props) {
  const taxMap: Record<number, WithholdingTax> = {};
  for (const t of taxes) taxMap[t.month] = t;

  const [adjType, setAdjType] = useState<"refund" | "surcharge">(
    adjustment?.adjustment_type ?? "refund"
  );
  const [adjAmountStr, setAdjAmountStr] = useState<string>(
    adjustment?.amount ? String(adjustment.amount) : ""
  );

  const taxTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const adjTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rows, setRows] = useState<Record<number, TaxRow>>(() => {
    const init: Record<number, TaxRow> = {};
    for (const m of MONTHS) {
      const t = taxMap[m];
      init[m] = {
        salaryStr: t?.salary_tax != null ? String(t.salary_tax) : "",
        feeStr: t?.fee_tax != null ? String(t.fee_tax) : "",
      };
    }
    return init;
  });

  function parseTax(str: string): number | null {
    const v = parseInt(str, 10);
    return isNaN(v) || str === "" ? null : v;
  }

  function buildTaxAmount(salary: number | null, fee: number | null): number | null {
    if (salary == null && fee == null) return null;
    return (salary ?? 0) + (fee ?? 0);
  }

  function saveTax(month: number, salary: number | null, fee: number | null, paid: boolean) {
    const existing = taxMap[month];
    const taxAmount = buildTaxAmount(salary, fee);
    const mockData: WithholdingTax = {
      id: existing?.id ?? `mock-${client.id}-${month}`,
      client_id: client.id,
      year,
      month,
      salary_tax: salary,
      fee_tax: fee,
      tax_amount: taxAmount,
      paid,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onTaxUpdated(mockData);
  }

  function saveAdjustment(type: "refund" | "surcharge", amount: number) {
    const mockData: YearEndAdjustment = {
      id: adjustment?.id ?? `mock-adj-${client.id}`,
      client_id: client.id,
      year,
      adjustment_type: type,
      amount,
      created_at: adjustment?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onAdjustmentUpdated(mockData);
  }

  function handleSalaryChange(month: number, value: string) {
    setRows((prev) => ({ ...prev, [month]: { ...prev[month], salaryStr: value } }));
    clearTimeout(taxTimers.current[month]);
    taxTimers.current[month] = setTimeout(() => {
      const existing = taxMap[month];
      const salary = parseTax(value);
      const fee = parseTax(rows[month].feeStr);
      saveTax(month, salary, fee, existing?.paid ?? false);
    }, 600);
  }

  function handleFeeChange(month: number, value: string) {
    setRows((prev) => ({ ...prev, [month]: { ...prev[month], feeStr: value } }));
    clearTimeout(taxTimers.current[month]);
    taxTimers.current[month] = setTimeout(() => {
      const existing = taxMap[month];
      const salary = parseTax(rows[month].salaryStr);
      const fee = parseTax(value);
      saveTax(month, salary, fee, existing?.paid ?? false);
    }, 600);
  }

  function handlePaidToggle(month: number) {
    const existing = taxMap[month];
    const salary = parseTax(rows[month].salaryStr) ?? existing?.salary_tax ?? null;
    const fee = parseTax(rows[month].feeStr) ?? existing?.fee_tax ?? null;
    saveTax(month, salary, fee, !(existing?.paid ?? false));
  }

  function handleAdjTypeChange(type: "refund" | "surcharge") {
    setAdjType(type);
    const amount = parseInt(adjAmountStr, 10);
    if (!isNaN(amount) && amount > 0) saveAdjustment(type, amount);
  }

  function handleAdjAmountChange(value: string) {
    setAdjAmountStr(value);
    if (adjTimer.current) clearTimeout(adjTimer.current);
    adjTimer.current = setTimeout(() => {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) saveAdjustment(adjType, parsed);
    }, 600);
  }

  function calcRow(month: number): {
    taxAmount: number | null;
    allocation: number;
    actualPayment: number | null;
    balance: number | null;
  } {
    const adjAmount = parseInt(adjAmountStr, 10);
    const carryover = adjType === "refund" && !isNaN(adjAmount) ? adjAmount : 0;
    let remainingCarryover = carryover;
    let result = {
      taxAmount: null as number | null,
      allocation: 0,
      actualPayment: null as number | null,
      balance: null as number | null,
    };

    for (const m of MONTHS) {
      const t = taxMap[m];
      const salary = parseTax(rows[m].salaryStr) ?? t?.salary_tax ?? null;
      const fee = parseTax(rows[m].feeStr) ?? t?.fee_tax ?? null;
      const taxAmount = buildTaxAmount(salary, fee);
      const validAmount = taxAmount != null ? taxAmount : null;

      const allocation = Math.min(remainingCarryover, validAmount ?? 0);
      const actualPayment = validAmount != null ? Math.max(0, validAmount - allocation) : null;
      remainingCarryover = Math.max(0, remainingCarryover - allocation);

      if (m === month) {
        result = { taxAmount: validAmount, allocation, actualPayment, balance: remainingCarryover > 0 ? remainingCarryover : null };
        break;
      }
    }
    return result;
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const withholdingAssignee = client.withholding_assignee ?? null;

  return (
    <div className="max-w-3xl">
      {/* 担当者 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">担当：</span>
        <AssigneeBadge assignee={withholdingAssignee} onClick={() => {}} disabled />
        {withholdingAssignee ? (
          <span className="text-xs text-gray-500">{withholdingAssignee}</span>
        ) : (
          <span className="text-xs text-gray-400">未設定（クライアント設定で変更）</span>
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-2 text-xs font-semibold text-gray-500 w-10">月</th>
            {/* 給与等・報酬等 を2列に */}
            <th colSpan={2} className="text-center py-1 px-2 text-xs font-semibold text-gray-500">
              源泉税額
            </th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 w-24">合計</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 w-24">充当額</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 w-24">実納税額</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 w-20">残高</th>
            <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 w-16">納付済</th>
          </tr>
          {/* サブヘッダー：給与等 / 報酬等 */}
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th />
            <th className="text-center py-1 px-2 text-[10px] font-medium text-gray-400 w-28">給与等</th>
            <th className="text-center py-1 px-2 text-[10px] font-medium text-gray-400 w-28">報酬等</th>
            <th colSpan={5} />
          </tr>
        </thead>
        <tbody>
          {/* 繰越行 */}
          <tr className="border-b border-gray-100">
            <td className="py-1.5 pr-2 text-xs text-gray-500">繰越</td>
            <td colSpan={4} className="text-center py-1.5 text-xs text-gray-400">─</td>
            <td className="text-right py-1.5 px-3 text-xs">
              {adjustment?.adjustment_type === "refund" && adjustment.amount > 0 ? (
                <span className="text-blue-700 font-medium">▲{fmt(adjustment.amount)}</span>
              ) : (
                <span className="text-gray-300">─</span>
              )}
            </td>
            <td colSpan={2} />
          </tr>

          {MONTHS.map((m) => {
            const { taxAmount, allocation, actualPayment, balance } = calcRow(m);
            const existing = taxMap[m];
            const isPaid = existing?.paid ?? false;
            const isCurrentMonth = year === currentYear && m === currentMonth;
            const isFuture = year === currentYear ? m > currentMonth : year > currentYear;
            const row = rows[m];

            return (
              <tr
                key={m}
                className={cn(
                  "border-b border-gray-100",
                  isCurrentMonth && "bg-blue-50/30",
                  isPaid && "opacity-70"
                )}
              >
                {/* 月 */}
                <td className={cn(
                  "py-1.5 pr-2 text-xs font-medium",
                  isCurrentMonth ? "text-blue-700" : "text-gray-600"
                )}>
                  {m}月
                </td>

                {/* 給与等 */}
                <td className="py-1.5 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-gray-400">¥</span>
                    <input
                      type="number"
                      min={0}
                      value={row.salaryStr}
                      onChange={(e) => handleSalaryChange(m, e.target.value)}
                      disabled={isPaid || isFuture}
                      placeholder={isFuture ? "─" : "0"}
                      className={cn(
                        "w-24 text-right text-xs rounded border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400",
                        isPaid || isFuture
                          ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </td>

                {/* 報酬等 */}
                <td className="py-1.5 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-gray-400">¥</span>
                    <input
                      type="number"
                      min={0}
                      value={row.feeStr}
                      onChange={(e) => handleFeeChange(m, e.target.value)}
                      disabled={isPaid || isFuture}
                      placeholder={isFuture ? "─" : "0"}
                      className={cn(
                        "w-24 text-right text-xs rounded border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400",
                        isPaid || isFuture
                          ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </td>

                {/* 合計（salary + fee） */}
                <td className="py-1.5 px-3 text-right text-xs text-gray-700 font-medium tabular-nums">
                  {taxAmount != null ? fmt(taxAmount) : <span className="text-gray-300">─</span>}
                </td>

                {/* 充当額 */}
                <td className="py-1.5 px-3 text-right text-xs">
                  {allocation > 0 ? (
                    <span className="text-blue-700 font-medium">▲{fmt(allocation)}</span>
                  ) : (
                    <span className="text-gray-300">─</span>
                  )}
                </td>

                {/* 実納税額 */}
                <td className="py-1.5 px-3 text-right text-xs">
                  {actualPayment != null ? (
                    <span className={actualPayment === 0 ? "text-gray-400" : "text-gray-700 font-medium"}>
                      {fmt(actualPayment)}
                    </span>
                  ) : (
                    <span className="text-gray-300">─</span>
                  )}
                </td>

                {/* 残高 */}
                <td className="py-1.5 px-3 text-right text-xs">
                  {balance != null && balance > 0 ? (
                    <span className="text-blue-700">▲{fmt(balance)}</span>
                  ) : (
                    <span className="text-gray-300">─</span>
                  )}
                </td>

                {/* 納付済チェック */}
                <td className="py-1.5 px-2 text-center">
                  {isFuture ? (
                    <span className="text-gray-200 text-xs">─</span>
                  ) : (
                    <button
                      onClick={() => handlePaidToggle(m)}
                      disabled={taxAmount == null && !isPaid}
                      className={cn(
                        "w-8 h-6 rounded text-xs font-medium transition-colors",
                        isPaid
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : taxAmount != null
                          ? "bg-gray-100 text-gray-400 hover:bg-gray-200 border border-dashed border-gray-300"
                          : "bg-gray-50 text-gray-200 cursor-not-allowed border border-gray-100"
                      )}
                    >
                      {isPaid ? "済" : "─"}
                    </button>
                  )}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 年末調整 */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
        <span className="text-xs font-semibold text-gray-600 w-16">年末調整</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`adj-type-${client.id}`}
              value="refund"
              checked={adjType === "refund"}
              onChange={() => handleAdjTypeChange("refund")}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">還付</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`adj-type-${client.id}`}
              value="surcharge"
              checked={adjType === "surcharge"}
              onChange={() => handleAdjTypeChange("surcharge")}
              className="accent-red-500"
            />
            <span className="text-xs text-gray-700">追徴</span>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">¥</span>
          <input
            type="number"
            min={0}
            value={adjAmountStr}
            onChange={(e) => handleAdjAmountChange(e.target.value)}
            placeholder="0"
            className="w-32 text-right text-xs rounded border border-gray-200 bg-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        {adjustment && (
          <span className="text-xs text-green-600 font-medium">保存済</span>
        )}
      </div>
    </div>
  );
}
