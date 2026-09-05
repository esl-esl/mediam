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
  course: number;
  label: string;
  academicYear: string;
  periods: AcademicPeriod[];
}

function makePeriods(startYear: number): AcademicPeriod[] {
  const nextYear = startYear + 1;
  return [
    { id: "m1", title: "1 модуль · учебный период", shortTitle: "1 модуль", type: "study", module: 1, start: `${startYear}-09-01`, end: `${startYear}-10-25` },
    { id: "s1", title: "Сессия после 1 модуля", shortTitle: "Сессия", type: "session", module: 1, start: `${startYear}-10-26`, end: `${startYear}-10-31` },
    { id: "m2", title: "2 модуль · учебный период", shortTitle: "2 модуль", type: "study", module: 2, start: `${startYear}-11-01`, end: `${startYear}-12-20` },
    { id: "s2", title: "Сессия после 2 модуля", shortTitle: "Сессия", type: "session", module: 2, start: `${startYear}-12-21`, end: `${startYear}-12-30` },
    { id: "winter", title: "Зимние каникулы", shortTitle: "Каникулы", type: "break", start: `${startYear}-12-31`, end: `${nextYear}-01-08` },
    { id: "m3", title: "3 модуль · учебный период", shortTitle: "3 модуль", type: "study", module: 3, start: `${nextYear}-01-09`, end: `${nextYear}-03-24` },
    { id: "s3", title: "Сессия после 3 модуля", shortTitle: "Сессия", type: "session", module: 3, start: `${nextYear}-03-25`, end: `${nextYear}-03-31` },
    { id: "m4", title: "4 модуль · учебный период", shortTitle: "4 модуль", type: "study", module: 4, start: `${nextYear}-04-01`, end: `${nextYear}-06-20` },
    { id: "spring", title: "Весенние каникулы", shortTitle: "Каникулы", type: "break", module: 4, start: `${nextYear}-05-02`, end: `${nextYear}-05-08` },
    { id: "s4", title: "Сессия после 4 модуля", shortTitle: "Сессия", module: 4, type: "session", start: `${nextYear}-06-21`, end: `${nextYear}-06-30` },
    { id: "summer", title: "Летние каникулы", shortTitle: "Каникулы", type: "break", start: `${nextYear}-07-01`, end: `${nextYear}-08-31` },
  ];
}

export const academicPeriods2026: AcademicPeriod[] = makePeriods(2026);

const academicYears: Record<number, AcademicYearDefinition> = {
  1: { course: 1, label: "1 курс", academicYear: "2026/2027", periods: academicPeriods2026 },
  2: { course: 2, label: "2 курс", academicYear: "2027/2028", periods: makePeriods(2027) },
};

export function academicYearForCourse(course: number): AcademicYearDefinition {
  return academicYears[course] ?? academicYears[course < 1 ? 1 : 2];
}

export function currentAcademicCourse(now = new Date()) {
  const secondCourseStart = new Date("2027-09-01T00:00:00");
  return now >= secondCourseStart ? 2 : 1;
}

function startOfDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function endOfDate(value: string) {
  return new Date(`${value}T23:59:59`);
}

export function academicCalendarState(now = new Date(), course = currentAcademicCourse(now)) {
  const year = academicYearForCourse(course);
  const periods = year.periods;

  // Short breaks can overlap a study period, so prefer breaks when both match.
  const current = [...periods]
    .sort((a, b) => Number(b.type === "break") - Number(a.type === "break"))
    .find((period) => now >= startOfDate(period.start) && now <= endOfDate(period.end));

  const chronological = periods
    .filter((period) => period.id !== "spring")
    .sort((a, b) => a.start.localeCompare(b.start));
  const next = chronological.find((period) => startOfDate(period.start) > now);
  const period = current ?? next ?? chronological.at(-1)!;
  const start = startOfDate(period.start).getTime();
  const end = endOfDate(period.end).getTime();
  const progress = current
    ? Math.max(0, Math.min(100, ((now.getTime() - start) / Math.max(1, end - start)) * 100))
    : 0;

  const nextPeriod = current?.id === "spring"
    ? { ...periods.find((item) => item.id === "m4")!, id: "m4-resume", title: "4 модуль · продолжение учебного периода", start: `${Number(year.academicYear.slice(0, 4)) + 1}-05-09` }
    : current
      ? chronological.find((item) => startOfDate(item.start) > endOfDate(current.end)) ?? null
      : next ?? null;

  return { current: current ?? null, next: nextPeriod, period, progress, year };
}
