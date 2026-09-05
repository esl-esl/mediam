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

export interface AcademicYearDefinition {
  course: 1 | 2;
  label: string;
  academicYear: string;
  periods: AcademicPeriod[];
}

// Границы 2026/27 используются как базовая модульная сетка планера.
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

function shiftIsoYear(value: string, offset: number) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year + offset}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftedPeriods(offset: number): AcademicPeriod[] {
  return academicPeriods2026.map((period) => ({
    ...period,
    id: `${period.id}-y${offset + 1}`,
    start: shiftIsoYear(period.start, offset),
    end: shiftIsoYear(period.end, offset),
  }));
}

export const academicYears: AcademicYearDefinition[] = [
  { course: 1, label: "1 курс", academicYear: "2026/2027", periods: academicPeriods2026 },
  { course: 2, label: "2 курс", academicYear: "2027/2028", periods: shiftedPeriods(1) },
];

const DAY_MS = 86_400_000;

function hseDateKey(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dayNumber(value: string) {
  return Date.parse(`${value}T00:00:00Z`) / DAY_MS;
}

export function academicYearForCourse(course: number) {
  return academicYears.find((item) => item.course === course) ?? academicYears[0];
}

export function currentAcademicCourse(now = new Date()): 1 | 2 {
  const today = hseDateKey(now);
  const active = academicYears.find((year) => year.periods.some((period) => today >= period.start && today <= period.end));
  if (active) return active.course;
  const next = academicYears.find((year) => year.periods.some((period) => period.start > today));
  return next?.course ?? 2;
}

export function academicCalendarState(now = new Date(), course: number = currentAcademicCourse(now)) {
  const year = academicYearForCourse(course);
  const periods = year.periods;
  const today = hseDateKey(now);
  const current = [...periods]
    .sort((a, b) => Number(b.type === "break") - Number(a.type === "break"))
    .find((period) => today >= period.start && today <= period.end);
  const chronological = periods
    .filter((period) => !period.id.startsWith("spring"))
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = chronological.find((period) => period.start > today);
  const period = current ?? next ?? chronological.at(-1)!;
  const start = dayNumber(period.start);
  const end = dayNumber(period.end);
  const progress = current ? Math.max(0, Math.min(100, ((dayNumber(today) - start) / Math.max(1, end - start + 1)) * 100)) : 0;
  const nextPeriod = current?.id.startsWith("spring")
    ? { ...periods.find((item) => item.id.startsWith("m4"))!, id: `m4-resume-y${year.course}`, title: "4 модуль · продолжение учебного периода", start: shiftIsoYear("2027-05-09", year.course - 1) }
    : current ? chronological.find((item) => item.start > current.end) ?? null : next ?? null;
  return { current: current ?? null, next: nextPeriod, period, progress, year };
}
