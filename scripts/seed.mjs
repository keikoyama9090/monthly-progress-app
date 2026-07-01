import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const envLines = readFileSync(".env.local", "utf-8").split("\n");
const dbLine = envLines.find((l) => l.startsWith("DATABASE_URL="));
if (!dbLine) throw new Error("DATABASE_URL not found in .env.local");
const DATABASE_URL = dbLine.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim();

const sql = neon(DATABASE_URL);

// 既存データ確認
const existing = await sql`SELECT COUNT(*) FROM clients`;
if (Number(existing[0].count) > 0) {
  console.log("Clients already seeded. Skipping.");
  process.exit(0);
}

const clients = [
  { id: "11111111-0000-4000-8000-000000000001", name: "株式会社アルファ商事",       sort_order: 1, enabled_tasks: [true,true,true,true,true],   task_assignees: ["K","K","C","K","K"], withholding_assignee: "K", fiscal_month: 3,  report_day: 20, withholding_type: "standard", industry: "小売業",           entity_type: "corporate",   tax_agent: true,  no_visit: false },
  { id: "11111111-0000-4000-8000-000000000002", name: "有限会社ベータ製作所",       sort_order: 2, enabled_tasks: [true,true,false,true,true],  task_assignees: ["C","C",null,"C","K"], withholding_assignee: "C", fiscal_month: 9,  report_day: 15, withholding_type: "special",  industry: "製造業",           entity_type: "corporate",   tax_agent: false, no_visit: true  },
  { id: "11111111-0000-4000-8000-000000000003", name: "合同会社ガンマコンサルティング", sort_order: 3, enabled_tasks: [true,true,true,false,true],  task_assignees: ["K","C","K",null,"C"], withholding_assignee: "K", fiscal_month: 12, report_day: 25, withholding_type: "standard", industry: "コンサルティング", entity_type: "corporate",   tax_agent: true,  no_visit: false },
  { id: "11111111-0000-4000-8000-000000000004", name: "株式会社デルタフーズ",       sort_order: 4, enabled_tasks: [true,false,false,true,true],  task_assignees: ["K",null,null,"K","C"], withholding_assignee: null, fiscal_month: 6,  report_day: 20, withholding_type: "special",  industry: "飲食業",           entity_type: "corporate",   tax_agent: false, no_visit: false },
  { id: "11111111-0000-4000-8000-000000000005", name: "イプシロン医療クリニック",   sort_order: 5, enabled_tasks: [true,true,true,true,false],  task_assignees: ["C","C","C","K",null], withholding_assignee: "C", fiscal_month: 3,  report_day: 10, withholding_type: "standard", industry: "医療・福祉",       entity_type: "individual",  tax_agent: true,  no_visit: true  },
];

for (const c of clients) {
  await sql.query(
    `INSERT INTO clients (id, name, sort_order, enabled_tasks, task_assignees, withholding_assignee, fiscal_month, report_day, withholding_type, industry, entity_type, tax_agent, no_visit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO NOTHING`,
    [c.id, c.name, c.sort_order, c.enabled_tasks, c.task_assignees, c.withholding_assignee,
     c.fiscal_month, c.report_day, c.withholding_type, c.industry, c.entity_type, c.tax_agent, c.no_visit]
  );
  console.log("Inserted client:", c.name);
}

const now = new Date().toISOString();
const y = new Date().getFullYear();
const m = new Date().getMonth() + 1;

const tasks = [
  { client_id: "11111111-0000-4000-8000-000000000001", year: y, month: m, task_index: 0, completed_at: now, memo: null },
  { client_id: "11111111-0000-4000-8000-000000000001", year: y, month: m, task_index: 1, completed_at: now, memo: "確認済み" },
  { client_id: "11111111-0000-4000-8000-000000000002", year: y, month: m, task_index: 0, completed_at: now, memo: null },
  { client_id: "11111111-0000-4000-8000-000000000004", year: y, month: m, task_index: 0, completed_at: now, memo: null },
  { client_id: "11111111-0000-4000-8000-000000000005", year: y, month: m, task_index: 0, completed_at: now, memo: null },
  { client_id: "11111111-0000-4000-8000-000000000005", year: y, month: m, task_index: 1, completed_at: now, memo: null },
  { client_id: "11111111-0000-4000-8000-000000000005", year: y, month: m, task_index: 2, completed_at: now, memo: null },
  { client_id: "11111111-0000-4000-8000-000000000005", year: y, month: m, task_index: 3, completed_at: now, memo: null },
];

for (const t of tasks) {
  await sql.query(
    `INSERT INTO monthly_tasks (client_id, year, month, task_index, completed_at, memo)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (client_id, year, month, task_index) DO NOTHING`,
    [t.client_id, t.year, t.month, t.task_index, t.completed_at, t.memo]
  );
}
console.log(`Inserted ${tasks.length} tasks`);

console.log("\nSeed complete!");
