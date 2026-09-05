"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Dialog drafts reset whenever a record opens. */

import * as React from "react";
import { toast } from "sonner";
import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Activity, GradeComponent, GradeEntry, LessonKind, Material, Note, StudyTask, Subject, SubjectIconKey } from "@/lib/planner-types";
import { plainTextToRichHtml, sanitizeRichTextHtml } from "@/lib/note-rich-text";
import { inferSubjectIcon } from "@/lib/subject-icons";
import { compareLessonsChronologically, lessonKindLabels, lessonNumberLabel, uid } from "@/lib/planner-utils";
import { cn } from "@/lib/utils";
import { usePlanner } from "./planner-provider";
import { SubjectIcon, subjectIconOptions } from "./subject-icon";

function toLocalInput(value?: string) {
  const date = value ? new Date(value) : new Date(Date.now() + 86_400_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

export function RelationPicker({ subjectId, lessonIds, topicIds, onLessonIdsChange, onTopicIdsChange }: {
  subjectId: string;
  lessonIds: string[];
  topicIds: string[];
  onLessonIdsChange: (ids: string[]) => void;
  onTopicIdsChange: (ids: string[]) => void;
}) {
  const { state } = usePlanner();
  if (subjectId === "none") return null;
  const lessons = state.lessons.filter((item) => item.subjectId === subjectId).sort(compareLessonsChronologically);
  const topics = state.topics.filter((item) => item.subjectId === subjectId).sort((a, b) => a.title.localeCompare(b.title, "ru"));
  const toggle = (values: string[], value: string, checked: boolean) => checked ? [...new Set([...values, value])] : values.filter((item) => item !== value);
  return <div className="grid gap-2.5 rounded-[14px] border border-border/65 bg-muted/25 p-2.5 sm:grid-cols-2">
    <Field label="Связанные занятия"><div className="max-h-36 space-y-0.5 overflow-y-auto pr-1">{lessons.map((lesson) => <label key={lesson.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-background/65"><Checkbox checked={lessonIds.includes(lesson.id)} onCheckedChange={(checked) => onLessonIdsChange(toggle(lessonIds, lesson.id, checked === true))} /><span className="min-w-0 flex-1 truncate">{lessonKindLabels[lesson.kind]} {lessonNumberLabel(lesson)} · {lesson.title || lessonKindLabels[lesson.kind]}</span>{lesson.date ? <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(lesson.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span> : null}</label>)}{!lessons.length ? <span className="text-sm text-muted-foreground">Занятий пока нет</span> : null}</div></Field>
    <Field label="Связанные темы"><div className="max-h-36 space-y-0.5 overflow-y-auto pr-1">{topics.map((topic) => <label key={topic.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-background/65"><Checkbox checked={topicIds.includes(topic.id)} onCheckedChange={(checked) => onTopicIdsChange(toggle(topicIds, topic.id, checked === true))} /><span className="truncate">{topic.title}</span></label>)}{!topics.length ? <span className="text-sm text-muted-foreground">Тем пока нет</span> : null}</div></Field>
  </div>;
}

export function TaskDialog({ open, onOpenChange, task, defaultSubjectId = null }: {
  open: boolean; onOpenChange: (open: boolean) => void; task?: StudyTask | null; defaultSubjectId?: string | null;
}) {
  const { state, mutate } = usePlanner();
  const [title, setTitle] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("none");
  const [type, setType] = React.useState<StudyTask["type"]>("homework");
  const [dueDate, setDueDate] = React.useState(toLocalInput());
  const [status, setStatus] = React.useState<StudyTask["status"]>("todo");
  const [priority, setPriority] = React.useState<StudyTask["priority"]>("medium");
  const [minutes, setMinutes] = React.useState("60");
  const [notes, setNotes] = React.useState("");
  const [subtasks, setSubtasks] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? ""); setSubjectId(task?.subjectId ?? defaultSubjectId ?? "none");
    setType(task?.type ?? "homework"); setDueDate(toLocalInput(task?.dueDate)); setStatus(task?.status ?? "todo");
    setPriority(task?.priority ?? "medium"); setMinutes(String(task?.estimatedMinutes ?? 60)); setNotes(task?.notes ?? "");
    setSubtasks(task?.subtasks.map((item) => item.title).join("\n") ?? "");
  }, [defaultSubjectId, open, task]);

  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!title.trim()) return;
    const lines = subtasks.split("\n").map((item) => item.trim()).filter(Boolean);
    mutate((draft) => {
      const next: StudyTask = {
        id: task?.id ?? uid("task"), subjectId: subjectId === "none" ? null : subjectId, title: title.trim(), type,
        dueDate: new Date(dueDate).toISOString(), status, priority, estimatedMinutes: Math.max(5, Number(minutes) || 60), notes: notes.trim(),
        subtasks: lines.map((line, index) => ({ id: task?.subtasks[index]?.id ?? uid("subtask"), title: line, done: task?.subtasks[index]?.done ?? false })),
        createdAt: task?.createdAt ?? new Date().toISOString(),
      };
      const index = draft.tasks.findIndex((item) => item.id === next.id);
      if (index >= 0) draft.tasks[index] = next; else draft.tasks.push(next);
    });
    toast.success(task ? "Дедлайн обновлён" : "Дедлайн добавлен"); onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit} className="grid gap-5">
    <DialogHeader><DialogTitle>{task ? "Изменить дедлайн" : "Новый дедлайн"}</DialogTitle></DialogHeader>
    <Field label="Название"><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Предмет"><Select value={subjectId} onValueChange={setSubjectId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Без предмета</SelectItem>{state.subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.shortTitle}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Тип"><Select value={type} onValueChange={(value) => setType(value as StudyTask["type"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="homework">Домашнее задание</SelectItem><SelectItem value="seminar">Семинар</SelectItem><SelectItem value="lecture">Лекция</SelectItem><SelectItem value="reading">Чтение</SelectItem><SelectItem value="project">Проект</SelectItem><SelectItem value="exam">Экзамен</SelectItem><SelectItem value="other">Другое</SelectItem></SelectContent></Select></Field>
      <Field label="Дата и время"><Input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
      <Field label="Статус"><Select value={status} onValueChange={(value) => setStatus(value as StudyTask["status"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todo">Нужно сделать</SelectItem><SelectItem value="doing">В работе</SelectItem><SelectItem value="done">Готово</SelectItem></SelectContent></Select></Field>
      <Field label="Приоритет"><Select value={priority} onValueChange={(value) => setPriority(value as StudyTask["priority"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">Высокий</SelectItem><SelectItem value="medium">Средний</SelectItem><SelectItem value="low">Низкий</SelectItem></SelectContent></Select></Field>
      <Field label="Время, минут"><Input type="number" min="5" step="5" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></Field>
    </div>
    <Field label="Подзадачи"><Textarea value={subtasks} onChange={(event) => setSubtasks(event.target.value)} placeholder="Одна строка — одна подзадача" /></Field>
    <Field label="Заметка"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
    <DialogFooter className="gap-2 sm:justify-between">{task ? <Button type="button" variant="destructive" onClick={() => { if (!window.confirm("Удалить дедлайн?")) return; mutate((draft) => { draft.tasks = draft.tasks.filter((item) => item.id !== task.id); }); onOpenChange(false); }}>Удалить</Button> : <span />}<span className="flex gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></span></DialogFooter>
  </form></DialogContent></Dialog>;
}

const courseColors = ["#0050CF", "#7C3AED", "#F04438", "#F97316", "#E0A000", "#00A878", "#00A6B2", "#008ED6", "#E53683", "#C43ED8"];

export function SubjectDialog({ open, onOpenChange, subject }: { open: boolean; onOpenChange: (open: boolean) => void; subject?: Subject | null }) {
  const { mutate } = usePlanner();
  const [manualIcon, setManualIcon] = React.useState(false);
  const [modules, setModules] = React.useState<number[]>([1]);
  const [form, setForm] = React.useState({ title: "", shortTitle: "", icon: "book" as SubjectIconKey, color: courseColors[0], pattern: "grid", year: "1", credits: "3", status: "required", language: "RU", description: "", sourceUrl: "" });
  React.useEffect(() => {
    if (!open) return;
    setManualIcon(Boolean(subject));
    setModules(subject?.modules?.length ? subject.modules : [subject?.module ?? 1]);
    setForm({ title: subject?.title ?? "", shortTitle: subject?.shortTitle ?? "", icon: subject?.icon ?? inferSubjectIcon(subject?.title ?? ""), color: subject?.color ?? courseColors[0], pattern: subject?.pattern ?? "grid", year: String(subject?.year ?? 1), credits: String(subject?.credits ?? 3), status: subject?.status ?? "required", language: subject?.language ?? "RU", description: subject?.description ?? "", sourceUrl: subject?.sourceUrl ?? "" });
  }, [open, subject]);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function setTitle(value: string) { setForm((current) => ({ ...current, title: value, icon: manualIcon ? current.icon : inferSubjectIcon(value) })); }
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!form.title.trim()) return;
    mutate((draft) => {
      const selectedModules = modules.length ? [...modules].sort() : [1];
      const next: Subject = { id: subject?.id ?? uid("subject"), title: form.title.trim(), shortTitle: form.shortTitle.trim() || form.title.trim(), icon: form.icon, color: form.color, pattern: form.pattern as Subject["pattern"], module: selectedModules[0], modules: selectedModules, year: Math.max(1, Number(form.year) || 1), credits: Math.max(0, Number(form.credits) || 0), status: form.status as Subject["status"], language: form.language as Subject["language"], scheduleLabel: subject?.scheduleLabel ?? "", room: subject?.room ?? "", description: form.description.trim(), objectives: subject?.objectives ?? [], sourceUrl: form.sourceUrl.trim() || undefined, targetGrade: subject?.targetGrade, roundingRule: subject?.roundingRule ?? "math", pinned: subject?.pinned ?? false };
      const index = draft.subjects.findIndex((item) => item.id === next.id); if (index >= 0) draft.subjects[index] = next; else draft.subjects.push(next);
    });
    toast.success(subject ? "Дисциплина обновлена" : "Дисциплина добавлена"); onOpenChange(false);
  }
  const iconSubject = { title: form.title || "Предмет", shortTitle: form.shortTitle || form.title || "П", icon: form.icon };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><form onSubmit={submit} className="grid gap-5">
    <DialogHeader><DialogTitle>{subject ? "Изменить дисциплину" : "Добавить дисциплину"}</DialogTitle></DialogHeader>
    <Field label="Название"><Input value={form.title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Короткое название"><Input value={form.shortTitle} onChange={(event) => set("shortTitle", event.target.value)} /></Field><Field label="Тип"><Select value={form.status} onValueChange={(value) => set("status", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="required">Обязательный</SelectItem><SelectItem value="elective">По выбору</SelectItem><SelectItem value="magolego">МагоЛего</SelectItem></SelectContent></Select></Field></div>
    <Field label="Иконка"><div className="grid grid-cols-7 gap-2 sm:grid-cols-11">{[...subjectIconOptions, "letter" as const].map((icon) => <button key={icon} type="button" aria-label={`Иконка ${icon}`} title={icon} onClick={() => { setManualIcon(true); set("icon", icon); }} className={cn("grid aspect-square place-items-center rounded-xl border bg-background transition hover:bg-muted", form.icon === icon && "border-[#0050CF] bg-[#0050CF]/8 text-[#0050CF] ring-1 ring-[#0050CF]")}><SubjectIcon subject={{ ...iconSubject, icon }} /></button>)}</div></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Курс"><Select value={form.year} onValueChange={(value) => set("year", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 курс</SelectItem><SelectItem value="2">2 курс</SelectItem></SelectContent></Select></Field><Field label="Кредиты"><Input type="number" min="0" max="30" value={form.credits} onChange={(event) => set("credits", event.target.value)} /></Field></div>
    <Field label="Модули"><div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((module) => <button key={module} type="button" onClick={() => setModules((current) => current.includes(module) ? current.length > 1 ? current.filter((item) => item !== module) : current : [...current, module].sort())} className={cn("rounded-xl border px-3 py-2 text-sm font-semibold transition", modules.includes(module) ? "border-[#0050CF] bg-[#0050CF] text-white shadow-[0_8px_22px_rgba(0,80,207,.22)]" : "bg-background/65 hover:bg-muted")}>М{module}</button>)}</div></Field>
    <Field label="Цвет"><div className="flex flex-wrap gap-2">{courseColors.map((color) => <button key={color} type="button" aria-label={color} onClick={() => set("color", color)} className="size-9 rounded-full border-2" style={{ backgroundColor: color, borderColor: form.color === color ? "var(--foreground)" : "transparent" }} />)}<Input type="color" value={form.color} onChange={(event) => set("color", event.target.value)} className="h-9 w-14 p-1" /></div></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Паттерн"><Select value={form.pattern} onValueChange={(value) => set("pattern", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">Сетка</SelectItem><SelectItem value="waves">Волны</SelectItem><SelectItem value="dots">Точки</SelectItem><SelectItem value="blocks">Блоки</SelectItem><SelectItem value="lines">Линии</SelectItem><SelectItem value="orbit">Орбита</SelectItem></SelectContent></Select></Field><Field label="Язык"><Select value={form.language} onValueChange={(value) => set("language", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RU">Русский</SelectItem><SelectItem value="EN">English</SelectItem></SelectContent></Select></Field></div>
    <Field label="Общая информация"><Textarea value={form.description} onChange={(event) => set("description", event.target.value)} /></Field>
    <Field label="Страница курса"><Input type="url" value={form.sourceUrl} onChange={(event) => set("sourceUrl", event.target.value)} placeholder="https://www.hse.ru/…" /></Field>
    <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

export function MaterialDialog({ open, onOpenChange, defaultSubjectId = null, defaultLessonId = null, defaultTopicId = null, defaultLessonIds, defaultTopicIds, defaultScope, defaultKind, material }: {
  open: boolean; onOpenChange: (open: boolean) => void; defaultSubjectId?: string | null; defaultLessonId?: string | null; defaultTopicId?: string | null; defaultLessonIds?: string[]; defaultTopicIds?: string[]; defaultScope?: Material["scope"]; defaultKind?: Material["kind"]; material?: Material | null;
}) {
  const { state, mutate, updateMaterial } = usePlanner();
  const [name, setName] = React.useState(""); const [label, setLabel] = React.useState(""); const [url, setUrl] = React.useState(""); const [tags, setTags] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("none"); const [kind, setKind] = React.useState<Material["kind"]>("link");
  const [lessonIds, setLessonIds] = React.useState<string[]>([]); const [topicIds, setTopicIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!open) return;
    setName(material?.name ?? ""); setLabel(material?.label ?? ""); setUrl(material?.url ?? ""); setTags(material?.tags?.join(", ") ?? "");
    setSubjectId(material?.subjectId ?? defaultSubjectId ?? "none"); setKind(material?.kind ?? defaultKind ?? "link");
    setLessonIds(material?.lessonIds ?? (material?.lessonId ? [material.lessonId] : defaultLessonId ? [defaultLessonId] : defaultLessonIds ?? []));
    setTopicIds(material?.topicIds ?? (material?.topicId ? [material.topicId] : defaultTopicId ? [defaultTopicId] : defaultTopicIds ?? []));
  }, [defaultKind, defaultLessonId, defaultLessonIds, defaultSubjectId, defaultTopicId, defaultTopicIds, material, open]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim() || (material?.storage !== "upload" && !url.trim())) return;
    const normalizedSubjectId = subjectId === "none" ? null : subjectId;
    const preservedWorkScope = material?.scope === "coursework" || material?.scope === "thesis" || defaultScope === "coursework" || defaultScope === "thesis";
    const scope = preservedWorkScope ? (material?.scope ?? defaultScope) : topicIds.length ? "topic" : lessonIds.length ? "lesson" : normalizedSubjectId ? "subject" : "general";
    const next: Material = { id: material?.id ?? uid("material"), subjectId: normalizedSubjectId, lessonId: lessonIds[0] ?? null, topicId: topicIds[0] ?? null, lessonIds, topicIds, scope, name: name.trim(), label: label.trim() || (material?.storage === "upload" ? "Материал" : "Ссылка"), kind, tags: [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))], storage: material?.storage ?? "link", url: material?.storage === "upload" ? material.url : url.trim(), mimeType: material?.mimeType, size: material?.size, createdAt: material?.createdAt ?? new Date().toISOString() };
    if (material?.storage === "upload") {
      const saved = await updateMaterial(next); if (!saved) return;
    } else {
      mutate((draft) => { const index = draft.materials.findIndex((item) => item.id === next.id); if (index >= 0) draft.materials[index] = next; else draft.materials.push(next); });
    }
    toast.success(material ? "Материал обновлён" : "Материал добавлен"); onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit} className="grid gap-4"><DialogHeader><DialogTitle>{material ? "Изменить материал" : "Добавить ссылку"}</DialogTitle></DialogHeader><Field label="Название"><Input value={name} onChange={(event) => setName(event.target.value)} autoFocus disabled={material?.storage === "upload"} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Предмет"><Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setLessonIds([]); setTopicIds([]); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Общие материалы</SelectItem>{state.subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.shortTitle}</SelectItem>)}</SelectContent></Select></Field><Field label="Тип"><Select value={kind} onValueChange={(value) => setKind(value as Material["kind"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{material?.storage === "upload" ? <SelectItem value="file">Файл</SelectItem> : <SelectItem value="link">Полезная ссылка</SelectItem>}<SelectItem value="recording">Запись лекции</SelectItem><SelectItem value="presentation">Презентация</SelectItem><SelectItem value="textbook">Учебник</SelectItem><SelectItem value="gradebook">Ведомость</SelectItem></SelectContent></Select></Field></div><Field label="Подпись"><Input value={label} onChange={(event) => setLabel(event.target.value)} /></Field>{material?.storage !== "upload" ? <Field label="URL"><Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></Field> : null}<Field label="Дополнительные теги"><Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="экзамен, обязательно, теория" /></Field><RelationPicker subjectId={subjectId} lessonIds={lessonIds} topicIds={topicIds} onLessonIdsChange={setLessonIds} onTopicIdsChange={setTopicIds} /><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function GradePartDialog({ open, onOpenChange, subjectId, part }: { open: boolean; onOpenChange: (open: boolean) => void; subjectId: string; part?: GradeComponent | null }) {
  const { mutate } = usePlanner();
  const [title, setTitle] = React.useState("");
  const [weight, setWeight] = React.useState("20");
  const [requiredCount, setRequiredCount] = React.useState("1");
  const [entries, setEntries] = React.useState<GradeEntry[]>([]);
  const [autoLessonKinds, setAutoLessonKinds] = React.useState<LessonKind[]>([]);
  React.useEffect(() => {
    if (!open) return;
    const sourceEntries = part?.gradeEntries ?? (part?.calculation === "lesson_average" ? [] : [{ id: uid("grade-mark"), value: part?.score ?? 0 }]);
    const count = part?.requiredCount ?? sourceEntries.length;
    setTitle(part?.title ?? "");
    setWeight(String((part?.weight ?? .2) * 100));
    setRequiredCount(String(count));
    setEntries(Array.from({ length: count }, (_, index) => sourceEntries[index] ?? { id: uid("grade-mark"), value: 0 }));
    setAutoLessonKinds(part?.autoLessonKinds ?? (part?.calculation === "lesson_average" && part.lessonKind ? [part.lessonKind] : []));
  }, [open, part]);
  const resizeEntries = (value: string) => {
    setRequiredCount(value);
    const count = Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
    setEntries((current) => Array.from({ length: count }, (_, index) => current[index] ?? { id: uid("grade-mark"), value: 0 }));
  };
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!title.trim()) return;
    const count = Math.max(autoLessonKinds.length ? 0 : 1, Math.min(100, Math.floor(Number(requiredCount) || 0)));
    const gradeEntries = Array.from({ length: count }, (_, index) => ({ id: entries[index]?.id ?? uid("grade-mark"), value: Math.max(0, Math.min(10, Number(entries[index]?.value) || 0)) }));
    mutate((draft) => {
      const next: GradeComponent = { id: part?.id ?? uid("grade"), subjectId, title: title.trim(), weight: Math.max(0, Math.min(100, Number(weight))) / 100, score: gradeEntries.length ? gradeEntries.reduce((sum, entry) => sum + entry.value, 0) / gradeEntries.length : 0, maxScore: 10, minScore: 0, scoreFormat: "numeric", calculation: "single", requiredCount: count, gradeEntries, autoLessonKinds: [...new Set(autoLessonKinds)] };
      const index = draft.grades.findIndex((item) => item.id === next.id); if (index >= 0) draft.grades[index] = next; else draft.grades.push(next);
    });
    toast.success("Формула обновлена"); onOpenChange(false);
  }
  const toggleKind = (kind: LessonKind, checked: boolean) => setAutoLessonKinds((current) => checked ? [...new Set([...current, kind])] : current.filter((item) => item !== kind));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit} className="grid gap-4"><DialogHeader><DialogTitle>{part ? "Редактирование элемента" : "Новый элемент формулы"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]"><Field label="Название"><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field><Field label="Вес, %"><Input type="number" min="0" max="100" step="1" value={weight} onChange={(event) => setWeight(event.target.value)} /></Field></div><Field label="Оценки вручную"><div className="rounded-[14px] border border-border/65 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Необходимое количество</span><Input type="number" min={autoLessonKinds.length ? 0 : 1} max="100" value={requiredCount} onChange={(event) => resizeEntries(event.target.value)} className="h-9 w-20 text-center" /></div>{entries.length ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{entries.map((entry, index) => <label key={entry.id} className="grid gap-1 text-center text-[11px] text-muted-foreground"><span>№ {index + 1}</span><Input type="number" min="0" max="10" step="0.1" value={entry.value} onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, value: Math.max(0, Math.min(10, Number(event.target.value) || 0)) } : item))} className="h-9 px-1 text-center text-sm font-semibold" /></label>)}</div> : null}</div></Field><Field label="Добавлять из занятий автоматически"><div className="grid gap-1 rounded-[14px] border border-border/65 p-2 sm:grid-cols-2">{(Object.keys(lessonKindLabels) as LessonKind[]).map((kind) => <label key={kind} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50"><Checkbox checked={autoLessonKinds.includes(kind)} onCheckedChange={(checked) => toggleKind(kind, checked === true)} /><span>{lessonKindLabels[kind]}</span></label>)}</div></Field><p className="text-xs leading-5 text-muted-foreground">Все оценки в формуле считаются по шкале 0–10. Оценки из занятий с другой числовой шкалой автоматически пересчитываются.</p><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></DialogFooter></form></DialogContent></Dialog>;
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const command = (name: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false);
    onChange(editorRef.current?.innerHTML ?? "");
  };
  const tools = [
    { name: "bold", label: "Жирный", icon: Bold },
    { name: "italic", label: "Курсив", icon: Italic },
    { name: "underline", label: "Подчёркнутый", icon: Underline },
    { name: "insertUnorderedList", label: "Маркированный список", icon: List },
    { name: "insertOrderedList", label: "Нумерованный список", icon: ListOrdered },
  ];
  return <div className="overflow-hidden rounded-[14px] border border-border/65 bg-background"><div className="flex flex-wrap gap-1 border-b border-border/55 bg-muted/35 p-1.5">{tools.map((item) => <Button key={item.name} type="button" variant="ghost" size="icon" className="size-8" aria-label={item.label} title={item.label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(item.name)}><item.icon className="size-4" /></Button>)}</div><div ref={editorRef} contentEditable suppressContentEditableWarning className="rich-text-editor min-h-44 px-3 py-2.5 text-sm leading-6 outline-none" dangerouslySetInnerHTML={{ __html: value }} onInput={(event) => onChange(event.currentTarget.innerHTML)} /></div>;
}

export function NoteDialog({ open, onOpenChange, note, defaultSubjectId = null, defaultLessonIds, defaultTopicIds }: { open: boolean; onOpenChange: (open: boolean) => void; note?: Note | null; defaultSubjectId?: string | null; defaultLessonIds?: string[]; defaultTopicIds?: string[] }) {
  const { state, mutate } = usePlanner(); const [title, setTitle] = React.useState(""); const [body, setBody] = React.useState(""); const [url, setUrl] = React.useState(""); const [format, setFormat] = React.useState<"text" | "link">("text"); const [subjectId, setSubjectId] = React.useState("none"); const [kind, setKind] = React.useState<Note["kind"]>("lecture"); const [tags, setTags] = React.useState(""); const [lessonIds, setLessonIds] = React.useState<string[]>([]); const [topicIds, setTopicIds] = React.useState<string[]>([]);
  React.useEffect(() => { if (!open) return; setTitle(note?.title ?? ""); setBody(note?.bodyFormat === "html" ? sanitizeRichTextHtml(note.body) : plainTextToRichHtml(note?.body ?? "")); setUrl(note?.url ?? ""); setFormat(note?.format ?? (note?.url ? "link" : "text")); setSubjectId(note?.subjectId ?? defaultSubjectId ?? "none"); setKind(note?.kind ?? "lecture"); setTags(note?.tags.join(", ") ?? ""); setLessonIds(note?.lessonIds ?? defaultLessonIds ?? []); setTopicIds(note?.topicIds ?? defaultTopicIds ?? []); }, [defaultLessonIds, defaultSubjectId, defaultTopicIds, note, open]);
  function submit(event: React.FormEvent) { event.preventDefault(); if (!title.trim() || (format === "link" && !url.trim())) return; mutate((draft) => { const next: Note = { id: note?.id ?? uid("note"), subjectId: subjectId === "none" ? null : subjectId, title: title.trim(), body: format === "text" ? sanitizeRichTextHtml(body) : "", bodyFormat: format === "text" ? "html" : "plain", format, url: format === "link" ? url.trim() : "", lessonIds, topicIds, kind, tags: [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))], updatedAt: new Date().toISOString() }; const index = draft.notes.findIndex((item) => item.id === next.id); if (index >= 0) draft.notes[index] = next; else draft.notes.unshift(next); }); toast.success("Конспект сохранён"); onOpenChange(false); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl"><form onSubmit={submit} className="grid gap-4"><DialogHeader><DialogTitle>{note ? "Редактирование конспекта" : "Новый конспект"}</DialogTitle></DialogHeader><Field label="Название"><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field><div className="grid gap-3 sm:grid-cols-3"><Field label="Предмет"><Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setLessonIds([]); setTopicIds([]); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Без предмета</SelectItem>{state.subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.shortTitle}</SelectItem>)}</SelectContent></Select></Field><Field label="Тип"><Select value={kind} onValueChange={(value) => setKind(value as Note["kind"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lecture">Лекция</SelectItem><SelectItem value="seminar">Семинар</SelectItem><SelectItem value="summary">Саммари</SelectItem><SelectItem value="idea">Идея</SelectItem></SelectContent></Select></Field><Field label="Формат"><Select value={format} onValueChange={(value) => setFormat(value as "text" | "link")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Текст</SelectItem><SelectItem value="link">Ссылка</SelectItem></SelectContent></Select></Field></div>{format === "link" ? <Field label="URL"><Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></Field> : <Field label="Текст"><RichTextEditor key={`${note?.id ?? "new"}-${open}`} value={body} onChange={setBody} /></Field>}<RelationPicker subjectId={subjectId} lessonIds={lessonIds} topicIds={topicIds} onLessonIdsChange={setLessonIds} onTopicIdsChange={setTopicIds} /><Field label="Теги"><Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Через запятую" /></Field><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function ActivityDialog({ open, onOpenChange, activity }: { open: boolean; onOpenChange: (open: boolean) => void; activity?: Activity | null }) {
  const { mutate } = usePlanner(); const [title, setTitle] = React.useState(""); const [category, setCategory] = React.useState<Activity["category"]>("event"); const [date, setDate] = React.useState(toLocalInput()); const [notes, setNotes] = React.useState(""); const [link, setLink] = React.useState("");
  React.useEffect(() => { if (!open) return; setTitle(activity?.title ?? ""); setCategory(activity?.category ?? "event"); setDate(toLocalInput(activity?.date)); setNotes(activity?.notes ?? ""); setLink(activity?.link ?? ""); }, [activity, open]);
  function submit(event: React.FormEvent) { event.preventDefault(); if (!title.trim()) return; mutate((draft) => { const next: Activity = { id: activity?.id ?? uid("activity"), title: title.trim(), category, status: activity?.status ?? "todo", date: new Date(date).toISOString(), deadline: new Date(date).toISOString(), link: link.trim() || undefined, notes: notes.trim() }; const index = draft.activities.findIndex((item) => item.id === next.id); if (index >= 0) draft.activities[index] = next; else draft.activities.push(next); }); toast.success("Активность сохранена"); onOpenChange(false); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><form onSubmit={submit} className="grid gap-5"><DialogHeader><DialogTitle>{activity ? "Изменить активность" : "Новая активность"}</DialogTitle></DialogHeader><Field label="Название"><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Категория"><Select value={category} onValueChange={(value) => setCategory(value as Activity["category"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="magolego">МагоЛего</SelectItem><SelectItem value="internship">Практика</SelectItem><SelectItem value="career">Карьера</SelectItem><SelectItem value="club">Клуб</SelectItem><SelectItem value="event">Мероприятие</SelectItem></SelectContent></Select></Field><Field label="Дата"><Input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></Field></div><Field label="Ссылка"><Input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" /></Field><Field label="Заметка"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></DialogFooter></form></DialogContent></Dialog>;
}
