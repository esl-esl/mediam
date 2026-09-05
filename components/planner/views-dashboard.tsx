"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowRight, BookOpenCheck, CalendarRange, ExternalLink, GraduationCap, Layers3, Plus, Route, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { academicCalendarState, academicYearForCourse, currentAcademicCourse } from "@/lib/academic-calendar";
import { compareSubjectsByStudyOrder, subjectModules } from "@/lib/planner-utils";
import { cn } from "@/lib/utils";
import { useClientNow } from "@/lib/use-client-now";
import { usePlanner } from "./planner-provider";
import { PageHeading, Panel, PanelHeader, TaskItem } from "./view-shared";
import { SubjectIcon } from "./subject-icon";

const hseSystems = [
  { title: "ЯУчусь", subtitle: "Оценки и рейтинг", href: "https://istudy.hse.ru/", icon: GraduationCap, color: "#0050cf" },
  { title: "SmartLMS", subtitle: "Материалы и задания", href: "https://edu.hse.ru/", icon: BookOpenCheck, color: "#7c3aed" },
  { title: "LMS", subtitle: "Портфолио и опросы", href: "https://lms.hse.ru/", icon: School, color: "#00a878" },
  { title: "Траектория", subtitle: "Выбор дисциплин", href: "https://smartway.hse.ru/", icon: Route, color: "#e53683" },
  { title: "Кампании выбора", subtitle: "Сроки и инструкции", href: "https://electives.hse.ru/", icon: CalendarRange, color: "#f97316" },
  { title: "SmartPro", subtitle: "ЭПП, курсовые и ВКР", href: "https://smartpro.hse.ru/", icon: Layers3, color: "#008ed6" },
];

function CourseSwitch({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <Tabs value={String(value)} onValueChange={(next) => onChange(Number(next))}>
    <TabsList className="h-9 rounded-[11px] bg-muted p-1">
      <TabsTrigger value="1" className="h-7 rounded-lg px-3 text-xs">1 курс</TabsTrigger>
      <TabsTrigger value="2" className="h-7 rounded-lg px-3 text-xs">2 курс</TabsTrigger>
    </TabsList>
  </Tabs>;
}

function ModuleNavigator({ course, onAddSubject, showAllLink = false, layout = "cards" }: { course: number; onAddSubject?: () => void; showAllLink?: boolean; layout?: "cards" | "list" }) {
  const { state } = usePlanner();
  const today = useClientNow();
  const calendar = academicCalendarState(today, course);
  const periods = academicYearForCourse(course).periods;
  const activeModule = calendar.current?.module;
  const nextModule = activeModule ? undefined : calendar.next?.module;

  return <section>
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="text-[17px] font-semibold tracking-[-.025em]">Модули</h2>
      <div className="flex items-center gap-1">
        {showAllLink ? <Button asChild variant="ghost" size="sm"><Link href="/courses">Все курсы<ArrowRight /></Link></Button> : null}
        {onAddSubject ? <Button variant="ghost" size="sm" onClick={onAddSubject}><Plus />Предмет</Button> : null}
      </div>
    </div>
    <div className={cn(layout === "list" ? "space-y-2" : "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4")}>
      {[1, 2, 3, 4].map((module) => {
        const study = periods.find((period) => period.type === "study" && period.module === module);
        const session = periods.find((period) => period.type === "session" && period.module === module);
        const subjects = state.subjects.filter((subject) => subject.year === course && subjectModules(subject).includes(module)).sort(compareSubjectsByStudyOrder);
        const isActive = module === activeModule;
        const isPast = Boolean(study && new Date(`${session?.end ?? study.end}T23:59:59`) < today);
        const isNext = !activeModule && module === nextModule;
        const stateLabel = isActive ? "Активный модуль" : isPast ? "Завершён" : isNext ? "Следующий" : "Впереди";

        return <Panel key={module} className={cn(layout === "list" ? "module-list-block" : `module-card module-card-tone-${module}`, isActive && "module-card-active", isNext && "module-card-next", isPast && !isActive && "module-card-past")}>
          <div className={cn("flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5", layout === "list" && "items-center")}>
            <span className="module-index grid size-8 place-items-center rounded-[10px] text-xs font-bold">М{module}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{stateLabel}</h3>
              {study ? <p className="mt-0.5 text-[11px] text-muted-foreground">{format(new Date(`${study.start}T00:00:00`), "d MMM", { locale: ru })} — {format(new Date(`${session?.end ?? study.end}T00:00:00`), "d MMM", { locale: ru })}</p> : null}
            </div>
          </div>
          <div className={cn("p-2", layout === "list" ? "grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3" : "space-y-1.5")}>
            {subjects.map((subject) => <Link key={subject.id} href={`/subjects/${subject.id}`} className="module-subject-link group flex min-w-0 items-center gap-2 rounded-[10px] px-2 py-1.5" style={{ "--subject-accent": subject.color } as CSSProperties}>
              <span className="grid size-7 shrink-0 place-items-center rounded-[9px] text-white shadow-sm" style={{ backgroundColor: subject.color }}><SubjectIcon subject={subject} className="size-3.5" /></span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{subject.shortTitle}</span>
              <ArrowRight className="size-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </Link>)}
            {!subjects.length ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Нет дисциплин</p> : null}
          </div>
        </Panel>;
      })}
    </div>
  </section>;
}

export function CoursesView({ onAddSubject }: { onAddSubject: () => void }) {
  const [course, setCourse] = React.useState<number>(currentAcademicCourse());
  return <main className="mx-auto w-full max-w-[1440px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10">
    <PageHeading title="Модули и курсы" action={<div className="flex items-center gap-2"><CourseSwitch value={course} onChange={setCourse} /><Button onClick={onAddSubject}><Plus />Предмет</Button></div>} />
    <ModuleNavigator course={course} layout="list" />
  </main>;
}

export function DashboardView({ onAddTask, onAddSubject }: { onAddTask: () => void; onAddSubject: () => void }) {
  const { state } = usePlanner();
  const [course, setCourse] = React.useState<number>(currentAcademicCourse());
  const now = useClientNow();
  const calendar = academicCalendarState(now, course);
  const deadlines = state.tasks.filter((task) => task.status !== "done").slice(0, 8);
  const periodTone = calendar.current?.type === "session" ? "academic-period-session" : calendar.current?.type === "break" ? "academic-period-break" : "academic-period-study";
  const periodLabel = calendar.current?.type === "session" ? "Сессия" : calendar.current?.type === "break" ? "Каникулы" : "Учебный период";

  return <main className="mx-auto w-full max-w-[1440px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10">
    <PageHeading title="Учёба" action={<div className="flex flex-wrap items-center justify-end gap-2"><CourseSwitch value={course} onChange={setCourse} /><Button variant="outline" onClick={onAddSubject}><Plus />Предмет</Button><Button onClick={onAddTask}><Plus />Дедлайн</Button></div>} />

    <Panel className="dashboard-deadlines">
      <PanelHeader title="Ближайшие дедлайны" action={<Button asChild variant="ghost" size="sm"><Link href="/tasks">Все<ArrowRight /></Link></Button>} />
      <div className="grid gap-2 p-2.5 lg:grid-cols-2">{deadlines.map((task) => <TaskItem key={task.id} task={task} dense />)}{!deadlines.length ? <p className="px-1 py-2 text-sm text-muted-foreground">Нет открытых дедлайнов</p> : null}</div>
    </Panel>

    <ModuleNavigator course={course} onAddSubject={onAddSubject} showAllLink />

    <Panel className={cn("academic-period-card relative overflow-hidden", periodTone)}>
      <div className="relative grid gap-3 p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="academic-period-badge rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[.12em]">{periodLabel}</span>{calendar.current?.module ? <span className="text-sm text-white/75">Модуль {calendar.current.module}</span> : null}<span className="text-sm text-white/75">{calendar.year.label} · {calendar.year.academicYear}</span></div>
          <h2 className="mt-2.5 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{calendar.current?.title ?? `Следующий период: ${calendar.period.title}`}</h2>
          <p className="mt-1 text-sm text-white/75">{format(new Date(`${calendar.period.start}T00:00:00`), "d MMMM", { locale: ru })} — {format(new Date(`${calendar.period.end}T00:00:00`), "d MMMM yyyy", { locale: ru })}</p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-white/80"><span>Пройдено</span><span>{Math.round(calendar.progress)}%</span></div>
          <Progress value={calendar.progress} className="academic-progress-track" />
          <div className="mt-2 flex justify-between gap-2 text-xs text-white/75"><span>{calendar.period.start.split("-").reverse().join(".")}</span><a href="https://www.hse.ru/studyspravka/grafik/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-white">График НИУ ВШЭ<ExternalLink className="size-3" /></a><span>{calendar.period.end.split("-").reverse().join(".")}</span></div>
        </div>
      </div>
    </Panel>

    <section>
      <h2 className="mb-2.5 text-[17px] font-semibold tracking-[-.025em]">Системы НИУ ВШЭ</h2>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{hseSystems.map((system) => <a key={system.href} href={system.href} target="_blank" rel="noreferrer" className="system-card group flex items-center gap-3 rounded-[16px] p-3" style={{ "--card-accent": system.color } as CSSProperties}><span className="card-accent-icon grid size-10 shrink-0 place-items-center rounded-[12px]"><system.icon className="size-4.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{system.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{system.subtitle}</span></span><ExternalLink className="size-3.5 text-muted-foreground transition group-hover:text-[var(--card-accent)]" /></a>)}</div>
    </section>
  </main>;
}
