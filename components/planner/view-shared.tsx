"use client";

import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { BookMarked, BookOpen, Check, ExternalLink, File, FileSpreadsheet, Link2, MoreHorizontal, Pencil, PlayCircle, Plus, Presentation, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GradeComponent, Material, Note, StudyTask, Subject } from "@/lib/planner-types";
import { plainTextToRichHtml, richTextToPlainText, sanitizeRichTextHtml } from "@/lib/note-rich-text";
import { formulaMarksForComponent, formatFileSize, formatSubjectModules, gradeComponentScore, isOverdue, lessonKindLabels, lessonNumberLabel, taskTypeLabels } from "@/lib/planner-utils";
import { cn } from "@/lib/utils";
import { GradePartDialog, MaterialDialog, NoteDialog, TaskDialog } from "./editor-dialogs";
import { usePlanner } from "./planner-provider";
import { SubjectIcon } from "./subject-icon";

export function PageHeading({ title, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex min-h-10 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="min-w-0 text-balance text-[28px] font-semibold tracking-[-.045em] sm:text-[34px]">{title}</h1>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

export function Panel({ children, className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("glass-panel surface-card rounded-[20px]", className)} {...props}>{children}</section>;
}

export function PanelHeader({ title, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5"><h2 className="text-[15px] font-semibold tracking-[-.015em]">{title}</h2>{action}</div>;
}

export function CourseCover({ subject, compact = false }: { subject: Subject; compact?: boolean }) {
  return <div className={cn("course-cover liquid-cover relative overflow-hidden rounded-[15px] bg-[var(--course-color)] text-white", compact ? "h-20" : "h-32")} style={{ "--course-color": subject.color } as React.CSSProperties} data-pattern={subject.pattern}>
    <span className={cn("absolute grid place-items-center rounded-[13px] border border-white/28 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_8px_24px_rgba(0,0,0,.16)] backdrop-blur-xl", compact ? "bottom-2.5 left-2.5 size-10" : "bottom-4 left-4 size-13")}><SubjectIcon subject={subject} className={compact ? "size-5" : "size-6"} /></span>
    <span className="absolute right-2.5 top-2.5 rounded-full border border-white/25 bg-black/10 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xl">{formatSubjectModules(subject)}</span>
  </div>;
}

export function SubjectDot({ subject, className }: { subject?: Subject; className?: string }) {
  return <span className={cn("grid size-4 shrink-0 place-items-center rounded-[5px] text-white", className)} style={{ backgroundColor: subject?.color ?? "#94A3B8" }}>{subject ? <SubjectIcon subject={subject} className="size-2.5" /> : null}</span>;
}

export function StatusBadge({ task }: { task: StudyTask }) {
  if (task.status === "done") return <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Check className="size-3" />Готово</Badge>;
  if (isOverdue(task)) return <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-300">Просрочено</Badge>;
  if (task.status === "doing") return <Badge variant="secondary" className="bg-[#0050CF]/10 text-[#0050CF] dark:text-blue-300">В работе</Badge>;
  return <Badge variant="secondary">В очереди</Badge>;
}

export function TaskItem({ task, dense = false }: { task: StudyTask; dense?: boolean }) {
  const { state, mutate } = usePlanner(); const [editing, setEditing] = React.useState(false);
  const subject = state.subjects.find((item) => item.id === task.subjectId); const date = new Date(task.dueDate);
  const accent = isOverdue(task) && task.status !== "done" ? "#f04438" : subject?.color ?? "#0050cf";
  return <><div className={cn("task-card group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3", dense ? "px-3.5 py-2.5" : "px-4 py-3")} style={{ "--task-accent": accent } as React.CSSProperties}>
    <Checkbox checked={task.status === "done"} onCheckedChange={(checked) => mutate((draft) => { const current = draft.tasks.find((item) => item.id === task.id); if (current) current.status = checked ? "done" : "todo"; })} aria-label="Изменить статус" />
    <button className="min-w-0 text-left" onClick={() => setEditing(true)}><span className={cn("block truncate text-[14px] font-semibold leading-5", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</span><span className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground"><span className="inline-flex min-w-0 items-center gap-1.5 truncate"><SubjectDot subject={subject} />{subject?.shortTitle ?? "Без предмета"}</span><span>·</span><span>{taskTypeLabels[task.type]}</span></span></button>
    <button onClick={() => setEditing(true)} className={cn("rounded-lg px-2 py-1 text-right transition group-hover:bg-muted/60", isOverdue(task) && "bg-red-500/8 text-red-600")}><span className="block text-xs font-semibold">{format(date, "d MMM", { locale: ru })}</span><span className="block text-[10px] opacity-65">{format(date, "HH:mm")}</span></button>
  </div><TaskDialog open={editing} onOpenChange={setEditing} task={task} /></>;
}

export function FormulaLine({ subject }: { subject: Subject }) {
  const { state } = usePlanner(); const parts = state.grades.filter((part) => part.subjectId === subject.id);
  if (!parts.length) return <span className="text-muted-foreground">Формула не добавлена</span>;
  return <span className="flex flex-wrap gap-1.5">{parts.map((part) => <span key={part.id} className="rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs"><strong>{Math.round(part.weight * 100)}%</strong>&nbsp; {part.title}</span>)}</span>;
}

function gradeSource(part: GradeComponent) {
  const manual = part.requiredCount ?? part.gradeEntries?.length ?? 0;
  const automatic = (part.autoLessonKinds ?? []).map((kind) => lessonKindLabels[kind]);
  return [manual ? `${manual} вручную` : "", automatic.length ? automatic.join(", ") : ""].filter(Boolean).join(" · ") || "Оценки не добавлены";
}

export function GradeEditor({ subject, compact = false }: { subject: Subject; compact?: boolean }) {
  const { state, mutate } = usePlanner(); const [dialogOpen, setDialogOpen] = React.useState(false); const [selected, setSelected] = React.useState<GradeComponent | null>(null);
  const parts = state.grades.filter((part) => part.subjectId === subject.id); const total = Math.round(parts.reduce((sum, part) => sum + part.weight, 0) * 100);
  return <div className="space-y-2.5"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Структура оценивания</span><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", total === 100 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300")}>{total}%</span></div>
    <div className="grade-table overflow-x-auto rounded-[14px] border border-border/65"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-border/55 text-[11px] text-muted-foreground"><th className="px-3 py-2 font-medium">Элемент</th><th className="px-3 py-2 font-medium">Оценки</th><th className="w-24 px-3 py-2 text-center font-medium">Среднее</th><th className="w-20 px-3 py-2 text-right font-medium">Вес</th><th className="w-10" /></tr></thead><tbody>{parts.map((part) => { const marks = formulaMarksForComponent(part, state.lessons); const average = gradeComponentScore(part, state.lessons); return <tr key={part.id} className="border-b border-border/45 last:border-0"><td className="px-3 py-2"><button className="max-w-64 truncate text-sm font-semibold hover:underline" onClick={() => { setSelected(part); setDialogOpen(true); }}>{part.title}</button></td><td className="max-w-[360px] px-3 py-2"><div className="flex max-w-full items-center gap-1 overflow-x-auto pb-0.5">{marks.map((mark) => <span key={mark.id} title={mark.label} className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-semibold", mark.source === "lesson" ? "border-[#0050CF]/25 bg-[#0050CF]/7 text-[#0050CF]" : "border-border/65 bg-muted/45")}>{mark.value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}</span>)}{!marks.length ? <span className="text-xs text-muted-foreground">{gradeSource(part)}</span> : null}</div><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{gradeSource(part)}</span></td><td className="px-3 py-2 text-center text-sm font-semibold tabular-nums">{average.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</td><td className="px-3 py-2 text-right text-sm font-semibold">{Math.round(part.weight * 100)}%</td><td className="pr-1"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { setSelected(part); setDialogOpen(true); }}><Pencil />Изменить</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => mutate((draft) => { draft.grades = draft.grades.filter((item) => item.id !== part.id); })}><Trash2 />Удалить</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>; })}</tbody></table>{!parts.length ? <p className="px-3 py-3 text-sm text-muted-foreground">Нет элементов формулы</p> : null}</div>
    {!compact ? <Button variant="outline" size="sm" onClick={() => { setSelected(null); setDialogOpen(true); }}><Plus />Элемент формулы</Button> : null}<GradePartDialog open={dialogOpen} onOpenChange={setDialogOpen} subjectId={subject.id} part={selected} />
  </div>;
}

const materialMeta: Record<Material["kind"], { label: string; icon: typeof File; color: string }> = {
  file: { label: "Файл", icon: File, color: "#0050cf" },
  link: { label: "Ссылка", icon: Link2, color: "#7c3aed" },
  textbook: { label: "Учебник", icon: BookMarked, color: "#00a878" },
  recording: { label: "Запись", icon: PlayCircle, color: "#e53683" },
  presentation: { label: "Презентация", icon: Presentation, color: "#f97316" },
  gradebook: { label: "Ведомость", icon: FileSpreadsheet, color: "#008ed6" },
};

export function MaterialCard({ material, compact = false }: { material: Material; compact?: boolean }) {
  const { state, removeMaterial } = usePlanner(); const [confirmOpen, setConfirmOpen] = React.useState(false); const [editOpen, setEditOpen] = React.useState(false); const meta = materialMeta[material.kind] ?? materialMeta.file; const Icon = meta.icon; const subject = state.subjects.find((item) => item.id === material.subjectId);
  const related = [...(material.lessonIds ?? (material.lessonId ? [material.lessonId] : [])).map((id) => { const lesson = state.lessons.find((item) => item.id === id); return lesson ? `${lessonKindLabels[lesson.kind]} ${lessonNumberLabel(lesson)}` : ""; }), ...(material.topicIds ?? (material.topicId ? [material.topicId] : [])).map((id) => state.topics.find((item) => item.id === id)?.title ?? "")].filter(Boolean);
  return <><div className={cn("resource-card group flex min-w-0 items-center gap-2.5 rounded-[15px] p-2.5", !compact && "p-3")} style={{ "--card-accent": meta.color } as React.CSSProperties}><span className="card-accent-icon grid size-9 shrink-0 place-items-center rounded-[11px]"><Icon className="size-4.5" /></span><a href={material.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold hover:underline">{material.name}</span><span className="mt-1 flex min-w-0 flex-wrap gap-1"><span className="rounded-md bg-[#0050CF]/9 px-1.5 py-0.5 text-[10px] font-semibold text-[#0050CF]">{meta.label}</span><span className="max-w-36 truncate rounded-md border border-border/55 bg-muted/45 px-1.5 py-0.5 text-[10px] font-medium" style={subject ? { color: subject.color, borderColor: `${subject.color}40` } : undefined}>{subject?.shortTitle ?? "Общее"}</span>{(material.tags ?? []).slice(0, 3).map((tag) => <span key={tag} className="max-w-32 truncate rounded-md border border-border/55 px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>)}{(material.tags?.length ?? 0) > 3 ? <span className="text-[10px] text-muted-foreground">+{material.tags!.length - 3}</span> : null}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{material.label || meta.label}{material.storage === "upload" ? ` · ${formatFileSize(material.size)}` : ""}{related.length ? ` · ${related.slice(0, 2).join(", ")}${related.length > 2 ? ` +${related.length - 2}` : ""}` : ""}</span></a><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 opacity-55 group-hover:opacity-100"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><a href={material.url} target="_blank" rel="noreferrer"><ExternalLink />Открыть</a></DropdownMenuItem><DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil />Изменить</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setConfirmOpen(true)}><Trash2 />Удалить</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить материал?</AlertDialogTitle><AlertDialogDescription>{material.name}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white" onClick={() => void removeMaterial(material)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><MaterialDialog open={editOpen} onOpenChange={setEditOpen} material={material} /></>;
}

export function MaterialsPanel({ subjectId = null, lessonId, topicId, scope, limit, onUpload }: { subjectId?: string | null; lessonId?: string | null; topicId?: string | null; scope?: Material["scope"]; limit?: number; onUpload?: () => void }) {
  const { state } = usePlanner(); const [addLinkOpen, setAddLinkOpen] = React.useState(false);
  const materials = state.materials.filter((item) => { const lessonIds = item.lessonIds ?? (item.lessonId ? [item.lessonId] : []); const topicIds = item.topicIds ?? (item.topicId ? [item.topicId] : []); return (subjectId === null || item.subjectId === subjectId) && (lessonId === undefined || lessonIds.includes(lessonId ?? "")) && (topicId === undefined || topicIds.includes(topicId ?? "")) && (!scope || item.scope === scope); }).slice(0, limit);
  return <div><div className="grid gap-2 md:grid-cols-2">{materials.map((item) => <MaterialCard key={item.id} material={item} compact />)}</div>{!materials.length ? <p className="rounded-[13px] border border-dashed border-border/70 px-3 py-3 text-sm text-muted-foreground">Пока пусто</p> : null}<div className="mt-2 flex flex-wrap gap-1.5"><Button variant="outline" size="sm" onClick={() => setAddLinkOpen(true)}><Link2 />Ссылка</Button>{onUpload ? <Button variant="outline" size="sm" onClick={onUpload}><Plus />Файл</Button> : null}</div><MaterialDialog open={addLinkOpen} onOpenChange={setAddLinkOpen} defaultSubjectId={subjectId} defaultLessonId={lessonId} defaultTopicId={topicId} defaultScope={scope} /></div>;
}

export function NotesPanel({ subjectId = null, lessonId, topicId }: { subjectId?: string | null; lessonId?: string; topicId?: string }) {
  const { state, mutate } = usePlanner();
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Note | null>(null);
  const notes = state.notes.filter((item) => (subjectId === null || item.subjectId === subjectId) && (!lessonId || item.lessonIds?.includes(lessonId)) && (!topicId || item.topicIds?.includes(topicId)));
  const openViewer = (note: Note) => { setSelected(note); setViewerOpen(true); };
  const openEditor = (note: Note | null) => { setSelected(note); setEditorOpen(true); };
  return <div><div className="grid gap-2 md:grid-cols-2">{notes.map((note) => { const related = [...(note.lessonIds ?? []).map((id) => { const lesson = state.lessons.find((item) => item.id === id); return lesson ? `${lessonKindLabels[lesson.kind]} ${lessonNumberLabel(lesson)}` : ""; }), ...(note.topicIds ?? []).map((id) => state.topics.find((item) => item.id === id)?.title ?? "")].filter(Boolean); const preview = note.bodyFormat === "html" ? richTextToPlainText(note.body) : note.body; return <article key={note.id} className="note-card group flex min-w-0 items-start gap-2.5 rounded-[15px] p-2.5" style={{ "--card-accent": note.kind === "seminar" ? "#00a878" : note.kind === "idea" ? "#f97316" : note.kind === "summary" ? "#e53683" : "#7c3aed" } as React.CSSProperties}><span className="card-accent-icon grid size-9 shrink-0 place-items-center rounded-[11px]"><BookOpen className="size-4" /></span><button className="min-w-0 flex-1 text-left" onClick={() => openViewer(note)}><span className="block truncate text-sm font-semibold">{note.title}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{{ lecture: "Лекция", seminar: "Семинар", idea: "Идея", summary: "Саммари" }[note.kind]}{note.format === "link" ? " · ссылка" : ""}{related.length ? ` · ${related.slice(0, 2).join(", ")}${related.length > 2 ? ` +${related.length - 2}` : ""}` : ""}</span>{preview ? <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">{preview}</span> : null}</button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 opacity-55 group-hover:opacity-100"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{note.format === "link" && note.url ? <DropdownMenuItem asChild><a href={note.url} target="_blank" rel="noreferrer"><ExternalLink />Открыть</a></DropdownMenuItem> : <DropdownMenuItem onSelect={() => openViewer(note)}><BookOpen />Просмотреть</DropdownMenuItem>}<DropdownMenuItem onSelect={() => openEditor(note)}><Pencil />Изменить</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => mutate((draft) => { draft.notes = draft.notes.filter((item) => item.id !== note.id); })}><Trash2 />Удалить</DropdownMenuItem></DropdownMenuContent></DropdownMenu></article>; })}</div>{!notes.length ? <p className="rounded-[13px] border border-dashed border-border/70 px-3 py-3 text-sm text-muted-foreground">Пока пусто</p> : null}<Button className="mt-2" size="sm" variant="outline" onClick={() => openEditor(null)}><BookOpen />Конспект</Button>
    <Dialog open={viewerOpen} onOpenChange={setViewerOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>{selected ? <>{selected.tags.length ? <div className="flex flex-wrap gap-1.5">{selected.tags.map((tag) => <span key={tag} className="rounded-full border border-border/70 bg-muted/45 px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>)}</div> : null}{selected.format === "link" && selected.url ? <Button asChild className="w-fit"><a href={selected.url} target="_blank" rel="noreferrer"><ExternalLink />Открыть конспект</a></Button> : <div className="rich-note-view" dangerouslySetInnerHTML={{ __html: selected.bodyFormat === "html" ? sanitizeRichTextHtml(selected.body) : plainTextToRichHtml(selected.body) }} />}</> : null}<DialogFooter><Button variant="outline" onClick={() => { setViewerOpen(false); if (selected) openEditor(selected); }}><Pencil />Изменить</Button></DialogFooter></DialogContent></Dialog>
    <NoteDialog open={editorOpen} onOpenChange={setEditorOpen} note={selected} defaultSubjectId={subjectId} defaultLessonIds={lessonId ? [lessonId] : undefined} defaultTopicIds={topicId ? [topicId] : undefined} />
  </div>;
}
