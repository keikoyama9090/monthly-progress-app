import type { Client, MonthlyTask } from "@/lib/types";

export const MOCK_CLIENTS: Client[] = [
  { id: "11111111-0000-4000-8000-000000000001", name: "株式会社アルファ商事", sort_order: 1, enabled_tasks: [true, true, true, true, true], task_assignees: ["K", "K", "C", "K", "K"], withholding_assignee: "K", fiscal_month: 3, report_day: 20, withholding_type: "standard", industry: "小売業", entity_type: "corporate", tax_agent: true, no_visit: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "11111111-0000-4000-8000-000000000002", name: "有限会社ベータ製作所", sort_order: 2, enabled_tasks: [true, true, false, true, true], task_assignees: ["C", "C", null, "C", "K"], withholding_assignee: "C", fiscal_month: 9, report_day: 15, withholding_type: "special", industry: "製造業", entity_type: "corporate", tax_agent: false, no_visit: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "11111111-0000-4000-8000-000000000003", name: "合同会社ガンマコンサルティング", sort_order: 3, enabled_tasks: [true, true, true, false, true], task_assignees: ["K", "C", "K", null, "C"], withholding_assignee: "K", fiscal_month: 12, report_day: 25, withholding_type: "standard", industry: "コンサルティング", entity_type: "corporate", tax_agent: true, no_visit: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "11111111-0000-4000-8000-000000000004", name: "株式会社デルタフーズ", sort_order: 4, enabled_tasks: [true, false, false, true, true], task_assignees: ["K", null, null, "K", "C"], withholding_assignee: null, fiscal_month: 6, report_day: 20, withholding_type: "special", industry: "飲食業", entity_type: "corporate", tax_agent: false, no_visit: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "11111111-0000-4000-8000-000000000005", name: "イプシロン医療クリニック", sort_order: 5, enabled_tasks: [true, true, true, true, false], task_assignees: ["C", "C", "C", "K", null], withholding_assignee: "C", fiscal_month: 3, report_day: 10, withholding_type: "standard", industry: "医療・福祉", entity_type: "individual", tax_agent: true, no_visit: true, created_at: "2026-01-01T00:00:00Z" },
];

const _y = new Date().getFullYear();
const _m = new Date().getMonth() + 1;

export const MOCK_CURRENT_TASKS: MonthlyTask[] = [
  // アルファ商事：データ受領○、会計入力○
  { id: "t01", client_id: "11111111-0000-4000-8000-000000000001", year: _y, month: _m, task_index: 0, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
  { id: "t02", client_id: "11111111-0000-4000-8000-000000000001", year: _y, month: _m, task_index: 1, completed_at: new Date().toISOString(), memo: "確認済み", created_at: new Date().toISOString() },
  // ベータ製作所：データ受領のみ完了
  { id: "t03", client_id: "11111111-0000-4000-8000-000000000002", year: _y, month: _m, task_index: 0, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
  // デルタフーズ：データ受領完了
  { id: "t04", client_id: "11111111-0000-4000-8000-000000000004", year: _y, month: _m, task_index: 0, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
  // イプシロン：全完了
  { id: "t05", client_id: "11111111-0000-4000-8000-000000000005", year: _y, month: _m, task_index: 0, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
  { id: "t06", client_id: "11111111-0000-4000-8000-000000000005", year: _y, month: _m, task_index: 1, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
  { id: "t07", client_id: "11111111-0000-4000-8000-000000000005", year: _y, month: _m, task_index: 2, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
  { id: "t08", client_id: "11111111-0000-4000-8000-000000000005", year: _y, month: _m, task_index: 3, completed_at: new Date().toISOString(), memo: null, created_at: new Date().toISOString() },
];
