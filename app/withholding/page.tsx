import { WithholdingClient } from "@/components/withholding-client";
import { sql } from "@/lib/db";
import type { Client, WithholdingTax, YearEndAdjustment } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "源泉税納付管理 | 月次進捗管理",
};

export default async function WithholdingPage() {
  const currentYear = new Date().getFullYear();

  const [clientRows, taxRows, adjRows] = await Promise.all([
    sql`SELECT * FROM clients ORDER BY sort_order ASC`,
    sql`SELECT * FROM withholding_taxes WHERE year = ${currentYear}`,
    sql`SELECT * FROM year_end_adjustments WHERE year = ${currentYear}`,
  ]);

  return (
    <WithholdingClient
      initialClients={clientRows as Client[]}
      initialTaxes={taxRows as WithholdingTax[]}
      initialAdjustments={adjRows as YearEndAdjustment[]}
      currentYear={currentYear}
    />
  );
}
