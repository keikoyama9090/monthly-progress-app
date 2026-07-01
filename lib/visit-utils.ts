import { VISIT_DANGER_DAYS, VISIT_WARN_DAYS } from './constants';

export function getDaysElapsed(visitedOn: string | undefined): number | null {
  if (!visitedOn) return null;
  const todayJST = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [ty, tm, td] = todayJST.split("-").map(Number);
  const [vy, vm, vd] = visitedOn.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const visitMs = Date.UTC(vy, vm - 1, vd);
  return Math.floor((todayMs - visitMs) / (1000 * 60 * 60 * 24));
}

export function formatVisitDate(visitedOn: string | undefined): string | null {
  if (!visitedOn) return null;
  const [, m, d] = visitedOn.split("-").map(Number);
  return `${m}/${d}`;
}

export type VisitStatus = 'danger' | 'warn' | 'ok' | 'none';

export function getVisitStatus(days: number | null): VisitStatus {
  if (days === null) return 'none';
  if (days >= VISIT_DANGER_DAYS) return 'danger';
  if (days >= VISIT_WARN_DAYS) return 'warn';
  return 'ok';
}
