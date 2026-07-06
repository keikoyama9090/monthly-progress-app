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

function buildDeadlineStatus(
  client: Client,
  currentMonthTasks: MonthlyTask[],
  today: Date
): string | null {
  if (client.report_day == null) return null;

  const enabledCount = client.enabled_tasks.filter(Boolean).length;
  if (enabledCount === 0) return null;

  const completedCount = currentMonthTasks.filter(
    (t) => t.completed_at !== null && client.enabled_tasks[t.task_index]
  ).length;
  if (completedCount >= enabledCount) return null;

  const todayJST = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const todayDay = Number(todayJST.split('-')[2]);
  const remaining = client.report_day - todayDay;
  const progress = `今月の進捗 ${completedCount}/${enabledCount}`;

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

// AI連携（第2段階）に置き換える際は memo_highlights テーブルからの
// clientId -> string | null な取得関数に差し替える想定
const MOCK_MEMO_HIGHLIGHTS: Record<string, string> = {
  '11111111-0000-4000-8000-000000000002': '先方から資料が届かず、月末までかかりそう',
  '11111111-0000-4000-8000-000000000004': '経理担当者が変更、来月から連絡先が変わる予定',
};

function getMockMemoHighlight(clientId: string): string | null {
  return MOCK_MEMO_HIGHLIGHTS[clientId] ?? null;
}

export function buildBriefingItems(
  clients: Client[],
  currentMonthTasks: MonthlyTask[],
  latestVisits: Record<string, string>,
  today: Date = new Date()
): BriefingItem[] {
  const items: BriefingItem[] = [];

  for (const client of clients) {
    const clientTasks = currentMonthTasks.filter((t) => t.client_id === client.id);
    const deadlineText = buildDeadlineStatus(client, clientTasks, today);
    const visitText = buildVisitStatus(client, latestVisits[client.id]);
    const memoHighlight = getMockMemoHighlight(client.id);

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
