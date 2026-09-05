"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Overlay drafts reset when another record opens. */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isSameDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, BookOpen, CalendarDays, ClipboardCheck, ExternalLink, FileSpreadsheet, FileUp, FlaskConical, GraduationCap, Layers3, Link2, MoreHorizontal, Pencil, Plus, Presentation, Trash2, Users, Wrench } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentFormat, CourseLesson, CourseTopic, LessonKind, Material } from "@/lib/planner-types";
import { assessmentFormatLabels, assessmentValueLabel, formatSubjectModules, lessonKindLabels, uid } from "@/lib/planner-utils";
import { cn } from "@/lib/utils";
import { MaterialDialog, SubjectDialog, TaskDialog } from "./editor-dialogs";
import { usePlanner } from "./planner-provider";
import { SubjectIcon } from "./subject-icon";
import { FormulaLine, GradeEditor, MaterialCard, MaterialsPanel, NotesPanel, Panel, TaskItem } from "./view-shared";
import { UploadDialog } from "./views-grades-materials";

const lessonIcons: Record<LessonKind, typeof BookOpen> = { lecture: Presentation, seminar: Users, nis: FlaskConical, control: ClipboardCheck, exam: GraduationCap, workshop: Wrench };

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>; }
function dateValue(value?: string) { return value ? value.slice(0, 10) : ""; }
function storeDate(value: string) { return value ? `${value}T12:00:00.000Z` : undefined; }

function normalizeLessonNumbers(
  values: number[] | undefined,
  fallback: number
) {
  const source = Array.isArray(values) && values.length ? values : [fallback];
  const numbers = [
    ...new Set(
      source
        .map(Number)
        .filter((item) => Number.isInteger(item) && item > 0)
    ),
  ].sort((a, b) => a - b);

  return numbers.length ? numbers : [Math.max(1, fallback || 1)];
}

function lessonNumbersLabel(lesson: Pick<CourseLesson, "number" | "numbers">) {
  const numbers = normalizeLessonNumbers(lesson.numbers, lesson.number);

  if (
    numbers.length > 1 &&
    numbers.every(
      (value, index) =>
        index === 0 || value === numbers[index - 1] + 1
    )
  ) {
    return `${numbers[0]}–${numbers[numbers.length - 1]}`;
  }

  return numbers.join(", ");
}

function parseLessonNumbers(value: string, fallback: number) {
  const result: number[] = [];

  for (const token of value
    .split(/[;,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    const range = token.match(/^(\d+)\s*[-–—]\s*(\d+)$/);

    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const low = Math.min(start, end);
      const high = Math.max(start, end);

      // A class range should stay compact; the cap also protects accidental input.
      for (let item = low; item <= Math.min(high, low + 20); item += 1) {
        if (item > 0) result.push(item);
      }
      continue;
    }

    const numeric = Number(token);
    if (Number.isInteger(numeric) && numeric > 0) result.push(numeric);
  }

  const unique = [...new Set(result)].sort((a, b) => a - b);
  return unique.length ? unique : [Math.max(1, fallback || 1)];
}

function colorWithAlpha(color: string, alpha: number) {
  const normalized = color.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return color;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function TopicEditorDialog({ open, onOpenChange, subjectId, topic, onUpload }: { open: boolean; onOpenChange: (value: boolean) => void; subjectId: string; topic?: CourseTopic | null; onUpload: (topicId: string) => void }) {
  const { state, mutate, removeMaterial } = usePlanner(); const [title, setTitle] = React.useState(""); const [notes, setNotes] = React.useState(""); const [lessonIds, setLessonIds] = React.useState<string[]>([]);
  const lessons = state.lessons.filter((item) => item.subjectId === subjectId).sort((a, b) => a.number - b.number);
  React.useEffect(() => { if (!open) return; setTitle(topic?.title ?? ""); setNotes(topic?.notes ?? ""); setLessonIds(topic ? state.lessons.filter((lesson) => lesson.subjectId === subjectId && lesson.topicIds.includes(topic.id)).map((lesson) => lesson.id) : []); }, [open, state.lessons, subjectId, topic]);
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!title.trim()) return; const id = topic?.id ?? uid("topic");
    mutate((draft) => {
      const next = { id, subjectId, title: title.trim(), notes: notes.trim() }; const index = draft.topics.findIndex((item) => item.id === id); if (index >= 0) draft.topics[index] = next; else draft.topics.push(next);
      draft.lessons.filter((lesson) => lesson.subjectId === subjectId).forEach((lesson) => { lesson.topicIds = lesson.topicIds.filter((topicId) => topicId !== id); if (lessonIds.includes(lesson.id)) lesson.topicIds.push(id); });
    }); onOpenChange(false);
  }
  async function remove() {
    if (!topic || !window.confirm("Удалить тему и связанные с ней материалы?")) return;
    const materials = state.materials.filter((item) => (item.topicIds ?? (item.topicId ? [item.topicId] : [])).includes(topic.id)); await Promise.all(materials.map(removeMaterial));
    mutate((draft) => { draft.topics = draft.topics.filter((item) => item.id !== topic.id); draft.lessons.forEach((lesson) => { lesson.topicIds = lesson.topicIds.filter((id) => id !== topic.id); }); draft.notes.forEach((note) => { note.topicIds = note.topicIds?.filter((id) => id !== topic.id); }); }); onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form onSubmit={submit} className="grid gap-4"><DialogHeader><DialogTitle>{topic ? "Тема курса" : "Новая тема"}</DialogTitle></DialogHeader><Field label="Название"><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></Field><Field label="Краткий конспект"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24" /></Field><Field label="Связанные занятия"><div className="grid max-h-44 gap-1 overflow-y-auto rounded-[14px] border border-border/65 bg-muted/20 p-2 sm:grid-cols-2">{lessons.map((lesson) => <label key={lesson.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background/65"><Checkbox checked={lessonIds.includes(lesson.id)} onCheckedChange={(checked) => setLessonIds((current) => checked ? [...new Set([...current, lesson.id])] : current.filter((id) => id !== lesson.id))} /><span className="truncate">{lessonNumbersLabel(lesson)}. {lesson.title || lessonKindLabels[lesson.kind]}</span></label>)}</div></Field>{topic ? <><Field label="Файлы и ссылки"><MaterialsPanel subjectId={subjectId} topicId={topic.id} onUpload={() => onUpload(topic.id)} /></Field><Field label="Связанные конспекты"><NotesPanel subjectId={subjectId} topicId={topic.id} /></Field></> : null}<DialogFooter className="gap-2 sm:justify-between">{topic ? <Button type="button" variant="ghost" className="text-destructive" onClick={() => void remove()}><Trash2 />Удалить</Button> : <span />}<span className="flex gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button><Button type="submit">Сохранить</Button></span></DialogFooter></form></DialogContent></Dialog>;
}

function LessonEditorDialog({
  open,
  onOpenChange,
  subjectId,
  lesson,
  nextNumber,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  subjectId: string;
  lesson?: CourseLesson | null;
  nextNumber: number;
  onUpload: (lessonId: string) => void;
}) {
  const { state, mutate, removeMaterial } = usePlanner();
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<LessonKind>("seminar");
  const [date, setDate] = React.useState("");
  const [numbersText, setNumbersText] = React.useState(String(nextNumber));
  const [topicIds, setTopicIds] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [assessmentFormat, setAssessmentFormat] =
    React.useState<AssessmentFormat>("none");
  const [assessmentValue, setAssessmentValue] = React.useState("");
  const [assessmentMin, setAssessmentMin] = React.useState("0");
  const [assessmentMax, setAssessmentMax] = React.useState("10");

  const topics = state.topics.filter(
    (item) => item.subjectId === subjectId
  );
  const subjectColor =
    state.subjects.find((item) => item.id === subjectId)?.color ??
    "#64748B";

  React.useEffect(() => {
    if (!open) return;

    setTitle(lesson?.title ?? "");
    setKind(lesson?.kind ?? "seminar");
    setDate(dateValue(lesson?.date));

    const initialNumbers = lesson
      ? normalizeLessonNumbers(lesson.numbers, lesson.number)
      : [nextNumber];

    setNumbersText(initialNumbers.join(", "));
    setTopicIds(lesson?.topicIds ?? []);
    setNotes(lesson?.notes ?? "");
    setAssessmentFormat(lesson?.assessmentFormat ?? "none");
    setAssessmentValue(lesson?.assessmentValue ?? "");
    setAssessmentMin(String(lesson?.assessmentMin ?? 0));
    setAssessmentMax(String(lesson?.assessmentMax ?? 10));
  }, [lesson, nextNumber, open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const id = lesson?.id ?? uid("lesson");
    const numbers = parseLessonNumbers(
      numbersText,
      lesson?.number ?? nextNumber
    );
    const number = numbers[0];
    const numberLabel =
      numbers.length > 1 &&
      numbers.every(
        (value, index) =>
          index === 0 || value === numbers[index - 1] + 1
      )
        ? `${numbers[0]}–${numbers[numbers.length - 1]}`
        : numbers.join(", ");

    const minimum = Number(assessmentMin) || 0;
    const maximum = Math.max(
      minimum + 1,
      Number(assessmentMax) || 10
    );

    mutate((draft) => {
      const next: CourseLesson = {
        id,
        subjectId,
        number,
        numbers,
        kind,
        title:
          title.trim() ||
          `${lessonKindLabels[kind]} ${numberLabel}`,
        topicIds,
        date: storeDate(date),
        assessmentFormat,
        assessmentValue:
          assessmentFormat === "none"
            ? ""
            : assessmentValue.trim(),
        assessmentMin: minimum,
        assessmentMax: maximum,
        grade:
          assessmentFormat === "numeric" &&
          assessmentValue !== ""
            ? Number(assessmentValue)
            : null,
        notes: notes.trim(),
      };

      const index = draft.lessons.findIndex(
        (item) => item.id === id
      );

      if (index >= 0) draft.lessons[index] = next;
      else draft.lessons.push(next);
    });

    onOpenChange(false);
  }

  async function remove() {
    if (
      !lesson ||
      !window.confirm(
        "Удалить занятие и связанные с ним материалы?"
      )
    ) {
      return;
    }

    const materials = state.materials.filter((item) =>
      (
        item.lessonIds ??
        (item.lessonId ? [item.lessonId] : [])
      ).includes(lesson.id)
    );

    await Promise.all(materials.map(removeMaterial));

    mutate((draft) => {
      draft.lessons = draft.lessons.filter(
        (item) => item.id !== lesson.id
      );
      draft.notes.forEach((note) => {
        note.lessonIds = note.lessonIds?.filter(
          (id) => id !== lesson.id
        );
      });
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {lesson
                ? lesson.title || lessonKindLabels[lesson.kind]
                : "Новое занятие"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
            <Field label="Название">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Тип">
              <Select
                value={kind}
                onValueChange={(value) =>
                  setKind(value as LessonKind)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(
                    lessonKindLabels
                  ) as LessonKind[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {lessonKindLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Дата занятия">
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>

            <Field label="Номера занятий">
              <div className="grid gap-1">
                <Input
                  value={numbersText}
                  onChange={(event) =>
                    setNumbersText(event.target.value)
                  }
                  inputMode="numeric"
                  placeholder="Например: 1, 2 или 3–4"
                />
                <span className="text-[11px] text-muted-foreground">
                  Несколько номеров в одной записи = одна дата и одна
                  общая оценка.
                </span>
              </div>
            </Field>
          </div>

          <Field label="Темы">
            <div className="flex flex-wrap gap-1.5 rounded-[14px] border border-border/65 bg-muted/20 p-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() =>
                    setTopicIds((current) =>
                      current.includes(topic.id)
                        ? current.filter((id) => id !== topic.id)
                        : [...current, topic.id]
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition",
                    topicIds.includes(topic.id)
                      ? "font-medium"
                      : "border-border/65 bg-background/45 text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    topicIds.includes(topic.id)
                      ? {
                          borderColor: `${subjectColor}66`,
                          backgroundColor: `${subjectColor}14`,
                          color: subjectColor,
                        }
                      : undefined
                  }
                >
                  {topic.title}
                </button>
              ))}

              {!topics.length ? (
                <span className="px-1 text-sm text-muted-foreground">
                  Сначала добавьте темы курса
                </span>
              ) : null}
            </div>
          </Field>

          <div className="grid gap-3 rounded-[15px] border border-border/65 bg-muted/22 p-3 sm:grid-cols-[190px_minmax(0,1fr)]">
            <Field label="Формат отметки">
              <Select
                value={assessmentFormat}
                onValueChange={(value) =>
                  setAssessmentFormat(
                    value as AssessmentFormat
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(
                    assessmentFormatLabels
                  ) as AssessmentFormat[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {assessmentFormatLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {assessmentFormat === "numeric" ? (
              <div className="grid grid-cols-3 gap-2">
                <Field label="От">
                  <Input
                    type="number"
                    step="any"
                    value={assessmentMin}
                    onChange={(event) =>
                      setAssessmentMin(event.target.value)
                    }
                  />
                </Field>
                <Field label="До">
                  <Input
                    type="number"
                    step="any"
                    value={assessmentMax}
                    onChange={(event) =>
                      setAssessmentMax(event.target.value)
                    }
                  />
                </Field>
                <Field label="Получено">
                  <Input
                    type="number"
                    step="any"
                    value={assessmentValue}
                    onChange={(event) =>
                      setAssessmentValue(event.target.value)
                    }
                    placeholder="—"
                  />
                </Field>
              </div>
            ) : assessmentFormat === "plusminus" ? (
              <Field label="Отметка">
                <Select
                  value={assessmentValue || "empty"}
                  onValueChange={(value) =>
                    setAssessmentValue(
                      value === "empty" ? "" : value
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">
                      Пока нет
                    </SelectItem>
                    <SelectItem value="+">+</SelectItem>
                    <SelectItem value="±">±</SelectItem>
                    <SelectItem value="−">−</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : assessmentFormat === "text" ? (
              <Field label="Отметка">
                <Input
                  value={assessmentValue}
                  onChange={(event) =>
                    setAssessmentValue(event.target.value)
                  }
                  placeholder="зачёт, принято, отлично…"
                />
              </Field>
            ) : (
              <div />
            )}
          </div>

          <Field label="Конспект и заметки">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-28"
            />
          </Field>

          {lesson ? (
            <>
              <Field label="Файлы и ссылки">
                <MaterialsPanel
                  subjectId={subjectId}
                  lessonId={lesson.id}
                  onUpload={() => onUpload(lesson.id)}
                />
              </Field>

              <Field label="Связанные конспекты">
                <NotesPanel
                  subjectId={subjectId}
                  lessonId={lesson.id}
                />
              </Field>
            </>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            {lesson ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => void remove()}
              >
                <Trash2 />
                Удалить
              </Button>
            ) : (
              <span />
            )}

            <span className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TimeTone = "past" | "active" | "next" | "future" | "undated";
const timeToneMeta: Record<TimeTone, { label: string; className: string; dot: string }> = {
  past: { label: "Прошло", className: "border-slate-300/55 bg-slate-100/38 opacity-78 dark:border-slate-600/50 dark:bg-slate-800/32", dot: "bg-slate-400" },
  active: { label: "Сегодня", className: "border-amber-400/65 bg-amber-50/72 shadow-[0_10px_34px_rgba(245,158,11,.16),inset_0_1px_0_rgba(255,255,255,.8)] dark:bg-amber-950/26", dot: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,.8)]" },
  next: { label: "Следующее", className: "", dot: "" },
  future: { label: "Впереди", className: "border-violet-300/60 bg-violet-50/48 dark:border-violet-700/45 dark:bg-violet-950/18", dot: "bg-violet-400" },
  undated: { label: "Без даты", className: "border-border/65 bg-background/42", dot: "bg-muted-foreground/45" },
};

function LessonCard({
  lesson,
  topics,
  tone,
  onOpen,
  color,
}: {
  lesson: CourseLesson;
  topics: CourseTopic[];
  tone: TimeTone;
  onOpen: () => void;
  color: string;
}) {
  const Icon = lessonIcons[lesson.kind];
  const meta = timeToneMeta[tone];
  const linked = topics.filter((topic) => lesson.topicIds.includes(topic.id));

  const nextStyle =
    tone === "next"
      ? {
          borderColor: colorWithAlpha(color, 0.55),
          backgroundColor: colorWithAlpha(color, 0.08),
          boxShadow: `0 12px 38px ${colorWithAlpha(color, 0.17)}`,
        }
      : undefined;

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group flex min-h-36 flex-col rounded-[16px] border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        meta.className
      )}
      style={nextStyle}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-[10px] border border-white/50 bg-background/55 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] dark:border-white/8">
          <Icon className="size-4" />
        </span>

        <span className="text-xs font-semibold text-muted-foreground">
          {lessonKindLabels[lesson.kind]} · {lessonNumbersLabel(lesson)}
        </span>

        <span
          className={cn("ml-auto size-2 rounded-full", meta.dot)}
          style={
            tone === "next"
              ? {
                  backgroundColor: color,
                  boxShadow: `0 0 13px ${colorWithAlpha(color, 0.78)}`,
                }
              : undefined
          }
        />

        <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
          {meta.label}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-5 tracking-[-.02em]">
        {lesson.title || `${lessonKindLabels[lesson.kind]} ${lessonNumbersLabel(lesson)}`}
      </h3>

      <div className="mt-2 flex flex-wrap gap-1">
        {linked.slice(0, 3).map((topic) => (
          <span
            key={topic.id}
            className="max-w-full truncate rounded-full bg-background/65 px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {topic.title}
          </span>
        ))}
        {linked.length > 3 ? (
          <span className="rounded-full bg-background/65 px-2 py-0.5 text-[10px] text-muted-foreground">
            +{linked.length - 3}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className="text-xs text-muted-foreground">
          {lesson.date
            ? format(new Date(lesson.date), "d MMMM", { locale: ru })
            : "Дата не указана"}
        </span>
        <span className="rounded-lg bg-background/65 px-2 py-1 text-xs font-semibold">
          {assessmentValueLabel(
            lesson.assessmentFormat,
            lesson.assessmentValue,
            lesson.assessmentMin,
            lesson.assessmentMax
          )}
        </span>
      </div>
    </button>
  );
}

function Section({ value, title, icon: Icon, children, action, color }: { value: string; title: string; icon: typeof BookOpen; children: React.ReactNode; action?: React.ReactNode; color: string }) {
  return <AccordionItem value={value} className="glass-panel overflow-hidden rounded-[18px]"><div className="flex min-h-12 items-center gap-1 px-3.5"><AccordionTrigger className="min-w-0 flex-1 items-center py-3 text-left text-[15px] font-semibold hover:no-underline"><span className="flex items-center gap-2.5"><span className="grid size-7 place-items-center rounded-[9px]" style={{ color, backgroundColor: `${color}18` }}><Icon className="size-4" /></span>{title}</span></AccordionTrigger>{action}</div><AccordionContent className="border-t border-border/50 p-0">{children}</AccordionContent></AccordionItem>;
}

export function SubjectView({ subjectId }: { subjectId: string }) {
  const { state, removeSubject } = usePlanner(); const router = useRouter(); const subject = state.subjects.find((item) => item.id === subjectId);
  const [editOpen, setEditOpen] = React.useState(false); const [taskOpen, setTaskOpen] = React.useState(false); const [selectedLesson, setSelectedLesson] = React.useState<CourseLesson | null | undefined>(undefined); const [selectedTopic, setSelectedTopic] = React.useState<CourseTopic | null | undefined>(undefined);
  const [uploadTarget, setUploadTarget] = React.useState<{ lessonId?: string; topicId?: string; scope: Material["scope"]; kind?: Material["kind"] } | null>(null); const [linkTarget, setLinkTarget] = React.useState<{ scope: Material["scope"]; kind?: Material["kind"] } | null>(null);
  if (!subject) return <div className="mx-auto max-w-xl px-6 py-20 text-center"><AlertTriangle className="mx-auto size-9 text-amber-500" /><h1 className="mt-4 text-2xl font-semibold">Дисциплина не найдена</h1><Button asChild className="mt-5"><Link href="/">На главную</Link></Button></div>;
  const lessons = state.lessons.filter((item) => item.subjectId === subject.id).sort((a, b) => a.number - b.number); const topics = state.topics.filter((item) => item.subjectId === subject.id); const tasks = state.tasks.filter((item) => item.subjectId === subject.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate)); const gradebooks = state.materials.filter((item) => item.subjectId === subject.id && item.kind === "gradebook"); const status = subject.status === "required" ? "Обязательный" : subject.status === "elective" ? "По выбору" : "МагоЛего";
  const today = startOfDay(new Date());
  const hasLessonsToday = lessons.some(
    (lesson) =>
      lesson.date && isSameDay(new Date(lesson.date), today)
  );
  const future = lessons
    .filter(
      (lesson) =>
        lesson.date &&
        startOfDay(new Date(lesson.date)) > today
    )
    .sort((a, b) =>
      String(a.date ?? "").localeCompare(String(b.date ?? ""))
    );
  const nextDate = !hasLessonsToday
    ? future[0]?.date
    : undefined;

  const tone = (lesson: CourseLesson): TimeTone => {
    if (!lesson.date) return "undated";

    const lessonDate = new Date(lesson.date);
    const lessonDay = startOfDay(lessonDate);

    if (isSameDay(lessonDate, today)) return "active";
    if (lessonDay < today) return "past";

    if (
      nextDate &&
      isSameDay(lessonDate, new Date(nextDate))
    ) {
      return "next";
    }

    return "future";
  };
  return <main className="mx-auto w-full max-w-[1280px] space-y-3.5 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Дисциплины</Link>
    <section
      className="relative isolate overflow-hidden rounded-[20px] border border-white/20 text-white shadow-[0_16px_46px_rgba(15,23,42,.14)]"
      style={{ background: subject.color } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.10),transparent_48%,rgba(0,0,0,.06))]" />

      <div className="relative flex items-start gap-3 p-4 sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-white/30 bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_10px_30px_rgba(0,0,0,.14)] backdrop-blur-sm">
          <SubjectIcon subject={subject} className="size-5 text-white" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/24 bg-white/16 px-2.5 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
              {status}
            </span>
            <span className="rounded-full border border-white/24 bg-white/16 px-2.5 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
              {formatSubjectModules(subject)}
            </span>
            <span className="rounded-full border border-white/24 bg-white/16 px-2.5 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
              {subject.credits} кр.
            </span>
            <span className="rounded-full border border-white/24 bg-white/16 px-2.5 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
              {subject.language}
            </span>
          </div>

          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-[-.045em] text-white sm:text-[30px]">
            {subject.title}
          </h1>

          {subject.description ? (
            <p className="mt-1.5 max-w-4xl text-sm leading-5 text-white/76">
              {subject.description}
            </p>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Изменить
            </DropdownMenuItem>
            {subject.sourceUrl ? (
              <DropdownMenuItem asChild>
                <a
                  href={subject.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink />
                  Страница курса
                </a>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(event) => event.preventDefault()}
                  className="text-destructive"
                >
                  <Trash2 />
                  Удалить
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить дисциплину?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Связанные занятия, темы, дедлайны, оценки и материалы
                    также будут удалены.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white"
                    onClick={async () => {
                      await removeSubject(subject.id);
                      router.push("/");
                    }}
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
    <Panel className="px-4 py-3"><div className="flex flex-col gap-2 border-l-4 pl-3 sm:flex-row sm:items-center" style={{ borderLeftColor: subject.color }}><span className="shrink-0 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Формула</span><div className="min-w-0 flex-1"><FormulaLine subject={subject} /></div></div></Panel>
    <Accordion type="multiple" defaultValue={["lessons"]} className="space-y-2.5">
      <Section color={subject.color} value="lessons" title="Занятия" icon={BookOpen} action={<Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedLesson(null); }}><Plus />Добавить</Button>}><div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">{lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} topics={topics} tone={tone(lesson)} color={subject.color} onOpen={() => setSelectedLesson(lesson)} />)}{!lessons.length ? <p className="col-span-full rounded-[14px] border border-dashed px-3 py-5 text-sm text-muted-foreground">Добавьте первое занятие</p> : null}</div></Section>
      <Section color={subject.color} value="topics" title="Темы курса" icon={Layers3} action={<Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedTopic(null); }}><Plus />Добавить</Button>}><div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">{topics.map((topic) => { const linked = lessons.filter((lesson) => lesson.topicIds.includes(topic.id)); return <button key={topic.id} onClick={() => setSelectedTopic(topic)} className="group flex min-h-28 flex-col rounded-[15px] border bg-background/38 p-3 text-left transition hover:-translate-y-0.5 hover:bg-background/65 hover:shadow-lg" style={{ borderColor: `${subject.color}45` }}><span className="text-[15px] font-semibold">{topic.title}</span>{topic.notes ? <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{topic.notes}</span> : null}<span className="mt-auto pt-3 text-[11px] text-muted-foreground">{linked.length ? linked.map((lesson) => `${lessonNumbersLabel(lesson)}. ${lessonKindLabels[lesson.kind]}`).join(" · ") : "Нет связанных занятий"}</span></button>; })}{!topics.length ? <p className="col-span-full rounded-[14px] border border-dashed px-3 py-5 text-sm text-muted-foreground">Добавьте темы и свяжите их с занятиями</p> : null}</div></Section>
      <Section color={subject.color} value="resources" title="Материалы и конспекты" icon={FileUp}><div className="grid gap-5 p-3 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">Файлы и ссылки</h3><MaterialsPanel subjectId={subject.id} onUpload={() => setUploadTarget({ scope: "subject" })} /></div><div><h3 className="mb-2 text-sm font-semibold">Конспекты</h3><NotesPanel subjectId={subject.id} /></div></div></Section>
      <Section color={subject.color} value="deadlines" title="Дедлайны" icon={CalendarDays} action={<Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setTaskOpen(true); }}><Plus />Добавить</Button>}><div>{tasks.map((task) => <TaskItem key={task.id} task={task} dense />)}{!tasks.length ? <p className="px-3 py-4 text-sm text-muted-foreground">Нет дедлайнов</p> : null}</div></Section>
      <Section color={subject.color} value="grades" title="Оценивание" icon={FileSpreadsheet}><div className="grid gap-5 p-3"><GradeEditor subject={subject} /><div><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Ведомость</h3><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setLinkTarget({ scope: "subject", kind: "gradebook" })}><Link2 />Ссылка</Button><Button size="sm" variant="ghost" onClick={() => setUploadTarget({ scope: "subject", kind: "gradebook" })}><FileUp />Файл</Button></div></div>{gradebooks.length ? <div className="grid gap-2 md:grid-cols-2">{gradebooks.map((item) => <MaterialCard key={item.id} material={item} compact />)}</div> : <p className="rounded-[13px] border border-dashed px-3 py-3 text-sm text-muted-foreground">Ведомость не добавлена</p>}</div></div></Section>
    </Accordion>
    <SubjectDialog open={editOpen} onOpenChange={setEditOpen} subject={subject} /><TaskDialog open={taskOpen} onOpenChange={setTaskOpen} defaultSubjectId={subject.id} /><LessonEditorDialog open={selectedLesson !== undefined} onOpenChange={(value) => { if (!value) setSelectedLesson(undefined); }} subjectId={subject.id} lesson={selectedLesson} nextNumber={
      Math.max(
        0,
        ...lessons.flatMap((lesson) =>
          normalizeLessonNumbers(lesson.numbers, lesson.number)
        )
      ) + 1
    } onUpload={(lessonId) => setUploadTarget({ lessonId, scope: "lesson" })} /><TopicEditorDialog open={selectedTopic !== undefined} onOpenChange={(value) => { if (!value) setSelectedTopic(undefined); }} subjectId={subject.id} topic={selectedTopic} onUpload={(topicId) => setUploadTarget({ topicId, scope: "topic" })} />
    <UploadDialog open={Boolean(uploadTarget)} onOpenChange={(value) => { if (!value) setUploadTarget(null); }} defaultSubject={subject.id} defaultLessonId={uploadTarget?.lessonId ?? null} defaultTopicId={uploadTarget?.topicId ?? null} defaultScope={uploadTarget?.scope} defaultKind={uploadTarget?.kind ?? "file"} /><MaterialDialog open={Boolean(linkTarget)} onOpenChange={(value) => { if (!value) setLinkTarget(null); }} defaultSubjectId={subject.id} defaultScope={linkTarget?.scope} defaultKind={linkTarget?.kind} />
  </main>;
}
