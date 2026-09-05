export type AcademicPeriodType = "study" | "session" | "break";

export interface AcademicPeriod {
  id: string;
  title: string;
  shortTitle: string;
  type: AcademicPeriodType;
  module?: number;
  start: string;
  end: string;
}

// Типовой график НИУ ВШЭ на 2026/27 учебный год по приказу университета.
export const academicPeriods2026: AcademicPeriod[] = [
  { id: "m1", title: "1 модуль · учебный период", shortTitle: "1 модуль", type: "study", module: 1, start: "2026-09-01", end: "2026-10-25" },
  { id: "s1", title: "Сессия после 1 модуля", shortTitle: "Сессия", type: "session", module: 1, start: "2026-10-26", end: "2026-10-31" },
  { id: "m2", title: "2 модуль · учебный период", shortTitle: "2 модуль", type: "study", module: 2, start: "2026-11-01", end: "2026-12-20" },
  { id: "s2", title: "Сессия после 2 модуля", shortTitle: "Сессия", type: "session", module: 2, start: "2026-12-21", end: "2026-12-30" },
  { id: "winter", title: "Зимние каникулы", shortTitle: "Каникулы", type: "break", start: "2026-12-31", end: "2027-01-08" },
  { id: "m3", title: "3 модуль · учебный период", shortTitle: "3 модуль", type: "study", module: 3, start: "2027-01-09", end: "2027-03-24" },
  { id: "s3", title: "Сессия после 3 модуля", shortTitle: "Сессия", type: "session", module: 3, start: "2027-03-25", end: "2027-03-31" },
  { id: "m4", title: "4 модуль · учебный период", shortTitle: "4 модуль", type: "study", module: 4, start: "2027-04-01", end: "2027-06-20" },
  { id: "spring", title: "Весенние каникулы", shortTitle: "Каникулы", type: "break", module: 4, start: "2027-05-02", end: "2027-05-08" },
  { id: "s4", title: "Сессия после 4 модуля", shortTitle: "Сессия", type: "session", module: 4, start: "2027-06-21", end: "2027-06-30" },
  { id: "summer", title: "Летние каникулы", shortTitle: "Каникулы", type: "break", start: "2027-07-01", end: "2027-08-31" },
];

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59`);
}

export function academicCalendarState(now = new Date()) {
  // Весенние каникулы перекрывают 4 модуль, поэтому проверяем короткие перерывы первыми.
  const current = [...academicPeriods2026]
    .sort((a, b) => (a.type === "break" ? -1 : 0) - (b.type === "break" ? -1 : 0))
    .find((period) => now >= startOfDate(period.start) && now <= endOfDate(period.end));
  const chronological = academicPeriods2026
    .filter((period) => period.id !== "spring")
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = chronological.find((period) => startOfDate(period.start) > now);
  const period = current ?? next ?? chronological.at(-1)!;
  const start = startOfDate(period.start).getTime();
  const end = endOfDate(period.end).getTime();
  const progress = current ? Math.max(0, Math.min(100, ((now.getTime() - start) / Math.max(1, end - start)) * 100)) : 0;
  const nextPeriod = current?.id === "spring"
    ? { ...academicPeriods2026.find((item) => item.id === "m4")!, id: "m4-resume", title: "4 модуль · продолжение учебного периода", start: "2027-05-09" }
    : current ? chronological.find((item) => startOfDate(item.start) > endOfDate(current.end)) ?? null : next ?? null;
  return { current: current ?? null, next: nextPeriod, period, progress };
}
