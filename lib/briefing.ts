import type { Client, MonthlyTask } from './types';
import { getDaysElapsed, getVisitStatus } from './visit-utils';

export type BriefingItem = {
  clientId: string;
  clientName: string;
  deadlineText: string | null;
  visitText: string | null;
  memoHighlight: string | null;
  priority: number;
};

// 経理業務は前月分の記帳・確認を翌月の report_day までに終える運用のため、
// 進捗は「今月分」ではなく「先月分（対象月）」のタスク完了状況で判定する
export function getTargetMonth(today: Date): { year: number; month: number } {
  const todayJST = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const [ty, tm] = todayJST.split('-').map(Number);
  return tm === 1 ? { year: ty - 1, month: 12 } : { year: ty, month: tm - 1 };
}

function buildDeadlineStatus(
  client: Client,
  targetMonthTasks: MonthlyTask[],
  today: Date,
  targetMonth: number
): string | null {
  if (client.report_day == null) return null;

  const enabledCount = client.enabled_tasks.filter(Boolean).length;
  if (enabledCount === 0) return null;

  const completedCount = targetMonthTasks.filter(
    (t) => t.completed_at !== null && client.enabled_tasks[t.task_index]
  ).length;
  if (completedCount >= enabledCount) return null;

  const todayJST = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const todayDay = Number(todayJST.split('-')[2]);
  const remaining = client.report_day - todayDay;
  const progress = `${targetMonth}月分の進捗 ${completedCount}/${enabledCount}`;

  if (remaining < 0) {
    return `⚠️ 期限を過ぎています（毎月${client.report_day}日）。${progress}`;
  }
  if (remaining === 0) {
    return `⚠️ 本日が報告期限です（${client.report_day}日）。${progress}`;
  }
  if (remaining <= 5) {
    return `📅 報告期限まであと${remaining}日（${client.report_day}日）。${progress}`;
  }
  return null;
}

function buildVisitStatus(client: Client, latestVisit: string | undefined): string | null {
  if (client.no_visit) return null;
  const days = getDaysElapsed(latestVisit);
  const status = getVisitStatus(days);
  if (status === 'danger') return `🔴 訪問${days}日経過（要対応）`;
  if (status === 'warn') return `🟡 訪問${days}日経過`;
  return null;
}

function getMemoHighlight(clientTasks: MonthlyTask[]): string | null {
  const withMemo = clientTasks
    .filter((t) => t.memo != null && t.memo.trim().length > 0)
    .sort((a, b) => a.task_index - b.task_index);
  return withMemo[0]?.memo ?? null;
}

export function buildBriefingItems(
  clients: Client[],
  targetMonthTasks: MonthlyTask[],
  latestVisits: Record<string, string>,
  today: Date = new Date()
): BriefingItem[] {
  const items: BriefingItem[] = [];
  const { month: targetMonth } = getTargetMonth(today);

  for (const client of clients) {
    const clientTasks = targetMonthTasks.filter((t) => t.client_id === client.id);
    const deadlineText = buildDeadlineStatus(client, clientTasks, today, targetMonth);
    const visitText = buildVisitStatus(client, latestVisits[client.id]);
    const memoHighlight = getMemoHighlight(clientTasks);

    if (!deadlineText && !visitText && !memoHighlight) continue;

    const visitStatus = client.no_visit
      ? 'none'
      : getVisitStatus(getDaysElapsed(latestVisits[client.id]));

    let priority = 4;
    if (visitStatus === 'danger') priority = 1;
    else if (deadlineText) priority = 2;
    else if (visitStatus === 'warn') priority = 3;

    items.push({
      clientId: client.id,
      clientName: client.name,
      deadlineText,
      visitText,
      memoHighlight,
      priority,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
