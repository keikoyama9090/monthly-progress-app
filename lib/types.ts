export type Assignee = 'K' | 'C' | 'client' | null;

export type Client = {
  id: string;
  name: string;
  sort_order: number;
  enabled_tasks: boolean[];
  task_assignees: Assignee[];
  withholding_assignee: Assignee;
  fiscal_month: number | null;
  report_day: number | null;
  withholding_type: 'standard' | 'special' | null;
  industry: string | null;
  entity_type: 'corporate' | 'individual' | null;
  tax_agent: boolean;
  no_visit: boolean;
  created_at: string;
};

export type MonthlyTask = {
  id: string;
  client_id: string;
  year: number;
  month: number;
  task_index: number;
  completed_at: string | null;
  memo: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  client_id: string;
  visited_on: string;
  created_at: string;
};

export type SelectedCell = {
  clientId: string;
  month: number;
} | null;

export type WithholdingTax = {
  id: string;
  client_id: string;
  year: number;
  month: number;
  salary_tax: number | null;
  fee_tax: number | null;
  tax_amount: number | null;
  paid: boolean;
  created_at: string;
  updated_at: string;
};

export type YearEndAdjustment = {
  id: string;
  client_id: string;
  year: number;
  adjustment_type: 'refund' | 'surcharge';
  amount: number;
  created_at: string;
  updated_at: string;
};
