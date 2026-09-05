"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatSubjectModules,
  subjectModules,
} from "@/lib/planner-utils";
import type { Subject } from "@/lib/planner-types";

import { usePlanner } from "./planner-provider";
import { PageHeading } from "./view-shared";
import { SubjectIcon } from "./subject-icon";

const moduleDates: Record<number, string> = {
  1: "1 сент. — 31 окт.",
  2: "1 нояб. — 30 дек.",
  3: "9 янв. — 31 мар.",
  4: "1 апр. — 30 июн.",
};

function subjectTypeLabel(subject: Subject) {
  if (subject.status === "required") return "Обязательный";
  if (subject.status === "elective") return "По выбору";
  return "МагоЛего";
}

function moduleStateLabel(
  year: number,
  module: number,
  currentYear: number,
  currentModule: number
) {
  if (year < currentYear) return "Завершён";
  if (year > currentYear) return "Впереди";
  if (module < currentModule) return "Завершён";
  if (module > currentModule) return "Впереди";
  return "Активный модуль";
}

function CourseRow({ subject }: { subject: Subject }) {
  return (
    <Link
      href={`/subjects/${subject.id}`}
      className="group flex min-w-0 items-center gap-3 py-3.5 transition hover:translate-x-0.5"
    >
      <span
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: subject.color }}
      />

      <span
        className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white shadow-sm"
        style={{ backgroundColor: subject.color }}
      >
        <SubjectIcon subject={subject} className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">
          {subject.shortTitle || subject.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {subjectTypeLabel(subject)} · {subject.credits} кр. · {subject.language}
        </span>
      </span>

      <span
        className="hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex"
        style={{
          color: subject.color,
          backgroundColor: `${subject.color}12`,
        }}
      >
        {formatSubjectModules(subject)}
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/55 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export function CoursesView({
  onAddSubject,
}: {
  onAddSubject: () => void;
}) {
  const { state } = usePlanner();

  const subjects = Array.isArray(state.subjects) ? state.subjects : [];
  const currentYear = Number(state.profile?.year ?? 1);
  const currentModule = Number(state.profile?.module ?? 1);

  const maxSubjectYear = subjects.reduce(
    (max, subject) => Math.max(max, Number(subject.year ?? 1)),
    1
  );
  const maxYear = Math.max(2, currentYear, maxSubjectYear);
  const years = Array.from({ length: maxYear }, (_, index) => index + 1);

  const [selectedYear, setSelectedYear] = React.useState(() =>
    years.includes(currentYear) ? currentYear : 1
  );
  const [viewMode, setViewMode] = React.useState<"modules" | "all">(
    "modules"
  );

  React.useEffect(() => {
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0] ?? 1);
    }
  }, [selectedYear, years.join(",")]);

  const yearSubjects = subjects.filter(
    (subject) => Number(subject.year ?? 1) === selectedYear
  );

  const sortedYearSubjects = [...yearSubjects].sort((a, b) => {
    const aModule = subjectModules(a)[0] ?? Number(a.module ?? 99);
    const bModule = subjectModules(b)[0] ?? Number(b.module ?? 99);

    return (
      aModule - bModule ||
      Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
      String(a.shortTitle ?? a.title ?? "").localeCompare(
        String(b.shortTitle ?? b.title ?? ""),
        "ru"
      )
    );
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12">
      <PageHeading
        title="Модули и курсы"
        action={
          <Button size="sm" onClick={onAddSubject}>
            <Plus />
            Предмет
          </Button>
        }
      />

      <div className="mt-5 flex flex-col gap-3 border-b border-border/65 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit rounded-[12px] bg-muted/55 p-1">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "modules" ? "secondary" : "ghost"}
            className="h-8 rounded-[9px]"
            onClick={() => setViewMode("modules")}
          >
            Модули
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "all" ? "secondary" : "ghost"}
            className="h-8 rounded-[9px]"
            onClick={() => setViewMode("all")}
          >
            Все курсы
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                selectedYear === year
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {year} курс
            </button>
          ))}
        </div>
      </div>

      {viewMode === "modules" ? (
        <div className="mt-1 border-b border-border/65">
          {[1, 2, 3, 4].map((module) => {
            const moduleSubjects = sortedYearSubjects.filter((subject) =>
              subjectModules(subject).includes(module)
            );

            const stateLabel = moduleStateLabel(
              selectedYear,
              module,
              currentYear,
              currentModule
            );
            const active =
              selectedYear === currentYear &&
              module === currentModule;

            return (
              <section
                key={`${selectedYear}-${module}`}
                className="grid gap-4 border-t border-border/65 py-5 md:grid-cols-[205px_minmax(0,1fr)] md:gap-8"
              >
                <div className="md:pt-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[22px] font-semibold tracking-[-.04em]">
                      М {module}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        active
                          ? "bg-[#0050CF]/10 text-[#0050CF]"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {stateLabel}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {moduleDates[module]}
                  </p>
                </div>

                <div className="min-w-0">
                  {moduleSubjects.length ? (
                    <div className="divide-y divide-border/55">
                      {moduleSubjects.map((subject) => (
                        <CourseRow
                          key={`${module}-${subject.id}`}
                          subject={subject}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-sm text-muted-foreground">
                      Предметы ещё не добавлены
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 border-y border-border/65">
          {sortedYearSubjects.length ? (
            <div className="divide-y divide-border/55">
              {sortedYearSubjects.map((subject) => (
                <CourseRow key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              На {selectedYear} курс пока не добавлены предметы
            </div>
          )}
        </div>
      )}
    </main>
  );
}
