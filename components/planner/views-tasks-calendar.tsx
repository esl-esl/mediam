"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudyTask } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { TaskDialog } from "./editor-dialogs";
import { usePlanner } from "./planner-provider";
import { PageHeading, Panel, PanelHeader, SubjectDot, TaskItem } from "./view-shared";

export function TasksView({ onAddTask }: { onAddTask: () => void }) {
  const { state } = usePlanner(); const router = useRouter(); const searchParams = useSearchParams(); const [query, setQuery] = React.useState(""); const [subject, setSubject] = React.useState("all"); const [status, setStatus] = React.useState("open");
  const requested = searchParams.get("task"); const queryTask = state.tasks.find((task) => task.id === requested) ?? null;
  const tasks = state.tasks.filter((task) => (!query || `${task.title} ${task.notes}`.toLowerCase().includes(query.toLowerCase())) && (subject === "all" || task.subjectId === subject) && (status === "all" || status === "open" && task.status !== "done" || task.status === status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12"><PageHeading title="Дедлайны" action={<Button onClick={onAddTask}><Plus />Добавить</Button>} /><Panel className="p-4"><div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" className="pl-9" /></div><Select value={subject} onValueChange={setSubject}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все предметы</SelectItem>{state.subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.shortTitle}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Открытые</SelectItem><SelectItem value="all">Все</SelectItem><SelectItem value="todo">Нужно сделать</SelectItem><SelectItem value="doing">В работе</SelectItem><SelectItem value="done">Готово</SelectItem></SelectContent></Select></div></Panel><Panel className="overflow-hidden">{tasks.map((task) => <TaskItem key={task.id} task={task} />)}{!tasks.length ? <p className="p-6 text-muted-foreground">Ничего не найдено</p> : null}</Panel><TaskDialog open={Boolean(queryTask)} onOpenChange={(value) => { if (!value) router.replace("/tasks"); }} task={queryTask} /></main>;
}

export function CalendarView({ onAddTask }: { onAddTask: () => void }) {
  const { state } = usePlanner();
  const [month, setMonth] = React.useState(startOfMonth(new Date()));
  const [selected, setSelected] = React.useState(new Date());
  const [editTask, setEditTask] = React.useState<StudyTask | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  // Сохраняем совместимость со старым prop, но календарь теперь
  // открывает собственную форму с выбранной датой.
  void onAddTask;

  const selectedDueDate = React.useMemo(() => {
    const value = new Date(selected);
    value.setHours(18, 0, 0, 0);
    return value.toISOString();
  }, [selected]);
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 }); const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 }); const days = eachDayOfInterval({ start, end }); const selectedTasks = state.tasks.filter((task) => isSameDay(new Date(task.dueDate), selected)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return <main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12"><PageHeading title="Календарь дедлайнов" action={<Button onClick={() => setCreateOpen(true)}><CalendarPlus />Добавить</Button>} /><div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_400px]">
    <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-border/60 px-4 py-4 sm:px-5"><h2 className="text-xl font-semibold capitalize">{format(month, "LLLL yyyy", { locale: ru })}</h2><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft /></Button><Button variant="outline" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>Сегодня</Button><Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button></div></div><div className="overflow-x-auto"><div className="min-w-[700px]"><div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</span>)}</div><div className="grid grid-cols-7">{days.map((day) => { const deadlines = state.tasks.filter((task) => isSameDay(new Date(task.dueDate), day)); return <button key={day.toISOString()} onClick={() => setSelected(day)} className={cn("min-h-28 border-b border-r border-border/55 p-2 text-left transition hover:bg-muted/35", !isSameMonth(day, month) && "bg-muted/15 text-muted-foreground", isSameDay(day, selected) && "bg-[#0050CF]/6 ring-2 ring-inset ring-[#0050CF]")}><span className={cn("grid size-7 place-items-center rounded-full text-sm", isSameDay(day, new Date()) && "bg-[#0050CF] font-semibold text-white")}>{format(day, "d")}</span><div className="mt-2 space-y-1">{deadlines.slice(0, 3).map((task) => { const course = state.subjects.find((item) => item.id === task.subjectId); return <span key={task.id} className="flex items-center gap-1.5 truncate rounded-md bg-background/75 px-1.5 py-1 text-[11px]"><SubjectDot subject={course} className="size-1.5" />{task.title}</span>; })}{deadlines.length > 3 ? <span className="text-[11px] text-muted-foreground">Ещё {deadlines.length - 3}</span> : null}</div></button>; })}</div></div></div></Panel>
    <Panel className="h-fit overflow-hidden"><PanelHeader title={format(selected, "d MMMM, EEEE", { locale: ru })} action={<Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)}><Plus />Добавить</Button>} /><div>{selectedTasks.map((task) => <TaskItem key={task.id} task={task} />)}{!selectedTasks.length ? <p className="p-5 text-muted-foreground">Нет дедлайнов</p> : null}</div></Panel>
  </div>
    <TaskDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      defaultDueDate={selectedDueDate}
    />
    <TaskDialog
      open={Boolean(editTask)}
      onOpenChange={(value) => {
        if (!value) setEditTask(null);
      }}
      task={editTask}
    />
  </main>;
}
