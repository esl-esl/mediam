"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { BookOpenCheck, CheckCircle2, FileStack, ListTodo } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { usePlanner } from "./planner-provider";
import { PageHeading, Panel, PanelHeader, SubjectDot } from "./view-shared";

export function AnalyticsView() {
  const { state } = usePlanner(); const done = state.tasks.filter((task) => task.status === "done").length; const open = state.tasks.length - done; const taskPercent = state.tasks.length ? done / state.tasks.length * 100 : 0;
  const markedLessons = state.lessons.filter((lesson) => lesson.assessmentFormat !== "none" && lesson.assessmentValue.trim()).length; const assessmentPercent = state.lessons.length ? markedLessons / state.lessons.length * 100 : 0;
  const metrics = [
    { label: "Закрыто дедлайнов", value: String(done), icon: CheckCircle2, color: "#00a878" },
    { label: "Открыто дедлайнов", value: String(open), icon: ListTodo, color: "#f04438" },
    { label: "Отмечено занятий", value: String(markedLessons), icon: BookOpenCheck, color: "#7c3aed" },
    { label: "Дисциплины", value: String(state.subjects.length), icon: FileStack, color: "#0050cf" },
  ];
  return <main className="mx-auto w-full max-w-[1280px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10"><PageHeading title="Аналитика" />
    <Panel className="analytics-summary-card relative overflow-hidden p-3 sm:p-4"><div className="relative grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((item) => <article key={item.label} className="analytics-summary-metric flex items-center gap-3 rounded-[15px] p-3"><span className="grid size-9 place-items-center rounded-[11px] bg-white shadow-sm" style={{ color: item.color } as CSSProperties}><item.icon className="size-4.5" /></span><div><p className="text-xl font-semibold tracking-[-.04em] text-white">{item.value}</p><p className="text-xs text-white/72">{item.label}</p></div></article>)}</div></Panel>
    <div className="grid gap-2.5 lg:grid-cols-2"><Panel><PanelHeader title="Дедлайны" /><div className="p-4"><div className="flex items-baseline justify-between"><span className="text-2xl font-semibold tracking-[-.05em]">{Math.round(taskPercent)}%</span><span className="text-xs text-muted-foreground">завершено</span></div><Progress value={taskPercent} className="mt-3 h-2" /></div></Panel><Panel><PanelHeader title="Отметки по занятиям" /><div className="p-4"><div className="flex items-baseline justify-between"><span className="text-2xl font-semibold tracking-[-.05em]">{Math.round(assessmentPercent)}%</span><span className="text-xs text-muted-foreground">занятий с отметкой</span></div><Progress value={assessmentPercent} className="mt-3 h-2" /></div></Panel></div>
    <Panel><PanelHeader title="Дисциплины" /><div className="divide-y divide-border/50">{state.subjects.map((subject) => { const lessons = state.lessons.filter((lesson) => lesson.subjectId === subject.id); const marked = lessons.filter((lesson) => lesson.assessmentFormat !== "none" && lesson.assessmentValue.trim()).length; const percent = lessons.length ? marked / lessons.length * 100 : 0; return <Link key={subject.id} href={`/subjects/${subject.id}`} className="grid gap-2 px-4 py-3 transition hover:bg-background/45 sm:grid-cols-[minmax(0,1fr)_90px_minmax(140px,.55fr)] sm:items-center"><span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold"><SubjectDot subject={subject} /><span className="truncate">{subject.title}</span></span><span className="text-xs text-muted-foreground">{marked} из {lessons.length}</span><Progress value={percent} className="h-1.5" /></Link>; })}</div></Panel>
  </main>;
}
