"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Upload fields reset when the dialog opens. */

import * as React from "react";
import Link from "next/link";
import { FileUp, Plus, Search, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Material } from "@/lib/planner-types";
import { currentAcademicCourse } from "@/lib/academic-calendar";
import { compareSubjectsByStudyOrder, formatSubjectModules } from "@/lib/planner-utils";
import { usePlanner } from "./planner-provider";
import { MaterialDialog, RelationPicker } from "./editor-dialogs";
import { CourseCover, GradeEditor, MaterialCard, PageHeading, Panel } from "./view-shared";

export function UploadDialog({ open, onOpenChange, defaultSubject = null, defaultLessonId = null, defaultTopicId = null, defaultLessonIds, defaultTopicIds, defaultScope, defaultKind = "file" }: {
  open: boolean; onOpenChange: (open: boolean) => void; defaultSubject?: string | null; defaultLessonId?: string | null; defaultTopicId?: string | null; defaultLessonIds?: string[]; defaultTopicIds?: string[]; defaultScope?: Material["scope"]; defaultKind?: Material["kind"];
}) {
  const { state, uploadMaterial } = usePlanner(); const [file, setFile] = React.useState<File | null>(null); const [subjectId, setSubjectId] = React.useState(defaultSubject ?? "none"); const [label, setLabel] = React.useState(""); const [kind, setKind] = React.useState<Material["kind"]>(defaultKind); const [loading, setLoading] = React.useState(false); const [lessonIds, setLessonIds] = React.useState<string[]>([]); const [topicIds, setTopicIds] = React.useState<string[]>([]);
  React.useEffect(() => { if (!open) return; setFile(null); setSubjectId(defaultSubject ?? "none"); setLabel(""); setKind(defaultKind); setLessonIds(defaultLessonId ? [defaultLessonId] : defaultLessonIds ?? []); setTopicIds(defaultTopicId ? [defaultTopicId] : defaultTopicIds ?? []); }, [defaultKind, defaultLessonId, defaultLessonIds, defaultSubject, defaultTopicId, defaultTopicIds, open]);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!file) return; setLoading(true); const material = await uploadMaterial(file, subjectId === "none" ? null : subjectId, label.trim() || "Материал", { lessonId: lessonIds[0] ?? null, topicId: topicIds[0] ?? null, lessonIds, topicIds, scope: defaultScope ?? (topicIds.length ? "topic" : lessonIds.length ? "lesson" : subjectId === "none" ? "general" : "subject"), kind }); setLoading(false); if (material) onOpenChange(false); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit} className="grid gap-4"><DialogHeader><DialogTitle>Загрузить файл</DialogTitle></DialogHeader><button type="button" className="grid min-h-28 place-items-center rounded-2xl border border-dashed bg-muted/30 p-4 text-center transition hover:bg-muted/50" onClick={() => document.getElementById("planner-file-input")?.click()}><span><UploadCloud className="mx-auto size-6 text-[#0050CF]" /><span className="mt-2 block font-medium">{file?.name ?? "Выбрать файл"}</span><span className="mt-1 block text-xs text-muted-foreground">до 20 МБ</span></span></button><input id="planner-file-input" type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Предмет</Label><Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setLessonIds([]); setTopicIds([]); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Без предмета</SelectItem>{state.subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.shortTitle}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Тип</Label><Select value={kind} onValueChange={(value) => setKind(value as Material["kind"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="file">Файл</SelectItem><SelectItem value="presentation">Презентация</SelectItem><SelectItem value="recording">Запись лекции</SelectItem><SelectItem value="textbook">Учебник</SelectItem><SelectItem value="gradebook">Ведомость</SelectItem></SelectContent></Select></div></div><div className="grid gap-2"><Label>Подпись</Label><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Лекция 4, список литературы…" /></div><RelationPicker subjectId={subjectId} lessonIds={lessonIds} topicIds={topicIds} onLessonIdsChange={setLessonIds} onTopicIdsChange={setTopicIds} /><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit" disabled={!file || loading}>{loading ? "Загрузка…" : "Загрузить"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function GradesView() {
  const { state } = usePlanner(); const [year, setYear] = React.useState(currentAcademicCourse()); const subjects = state.subjects.filter((subject) => subject.year === year).sort(compareSubjectsByStudyOrder);
  return <main className="mx-auto w-full max-w-[1280px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10"><PageHeading title="Оценки" action={<Tabs value={String(year)} onValueChange={(value) => setYear(Number(value) as 1 | 2)}><TabsList><TabsTrigger value="1">1 курс</TabsTrigger><TabsTrigger value="2">2 курс</TabsTrigger></TabsList></Tabs>} />
    <div className="grid gap-3 xl:grid-cols-2">{subjects.map((subject) => <Panel key={subject.id} className="course-grade-card overflow-hidden" style={{ "--card-accent": subject.color } as React.CSSProperties}><Link href={`/subjects/${subject.id}`} className="block p-2.5 pb-0"><CourseCover subject={subject} compact /></Link><div className="p-3"><div className="mb-2.5 flex items-center justify-between gap-3"><Link href={`/subjects/${subject.id}`} className="min-w-0 truncate text-base font-semibold hover:underline">{subject.title}</Link><span className="shrink-0 text-xs text-muted-foreground">{formatSubjectModules(subject)}</span></div><GradeEditor subject={subject} /></div></Panel>)}{!subjects.length ? <Panel className="p-5 text-sm text-muted-foreground">Дисциплины ещё не добавлены</Panel> : null}</div>
  </main>;
}

export function MaterialsView() {
  const { state } = usePlanner(); const [query, setQuery] = React.useState(""); const [subject, setSubject] = React.useState("all"); const [uploadOpen, setUploadOpen] = React.useState(false); const [linkOpen, setLinkOpen] = React.useState(false);
  const materials = state.materials.filter((item) => (subject === "all" || item.subjectId === subject) && `${item.name} ${item.label}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="mx-auto w-full max-w-[1400px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10"><PageHeading title="Материалы" action={<div className="flex gap-2"><Button variant="outline" onClick={() => setLinkOpen(true)}><Plus />Ссылка</Button><Button onClick={() => setUploadOpen(true)}><FileUp />Файл</Button></div>} />
    <Panel><div className="flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" className="pl-9" /></div><Select value={subject} onValueChange={setSubject}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все предметы</SelectItem>{state.subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.shortTitle}</SelectItem>)}</SelectContent></Select></div></Panel>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{materials.map((material) => <MaterialCard key={material.id} material={material} />)}</div>{!materials.length ? <Panel className="p-8 text-muted-foreground">Ничего не найдено</Panel> : null}
    <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} /><MaterialDialog open={linkOpen} onOpenChange={setLinkOpen} />
  </main>;
}
