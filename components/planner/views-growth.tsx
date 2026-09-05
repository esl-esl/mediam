"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Activity as ActivityIcon,
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  Check,
  Download,
  ExternalLink,
  GraduationCap,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  Activity,
  Material,
  PlannerState,
  Subject,
  ThesisState,
} from "@/lib/planner-types";
import { formatSubjectModules, uid } from "@/lib/planner-utils";
import { cn } from "@/lib/utils";
import {
  ActivityDialog,
  MaterialDialog,
  SubjectDialog,
} from "./editor-dialogs";
import { usePlanner } from "./planner-provider";
import { SubjectIcon } from "./subject-icon";
import {
  MaterialCard,
  PageHeading,
  Panel,
  PanelHeader,
  SubjectDot,
} from "./view-shared";
import { UploadDialog } from "./views-grades-materials";

function subjectStatusLabel(subject: Subject) {
  if (subject.status === "elective") return "По выбору";
  if (subject.status === "magolego") return "МагоЛего";
  return "Обязательный";
}

export function DiplomaView() {
  const { state, mutate } = usePlanner();
  const subjects = Array.isArray(state.subjects) ? state.subjects : [];
  const years = [...new Set(subjects.map((subject) => subject.year))]
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  return (
    <main className="mx-auto w-full max-w-[1120px] space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10">
      <PageHeading title="Диплом" />

      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Итоговые оценки вводятся вручную и не зависят от формул
        оценивания внутри дисциплин.
      </p>

      {years.map((year) => (
        <section key={year} className="space-y-2.5">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.13em] text-muted-foreground">
                Учебный год
              </p>
              <h2 className="mt-0.5 text-xl font-semibold">
                {year} курс
              </h2>
            </div>
          </div>

          <Panel className="overflow-hidden">
            {[1, 2, 3, 4].map((module) => {
              const moduleSubjects = subjects.filter(
                (subject) =>
                  subject.year === year &&
                  Number(subject.module) === module
              );

              return (
                <div
                  key={module}
                  className="border-b border-border/55 last:border-b-0"
                >
                  <div className="flex items-center gap-3 bg-muted/20 px-4 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-foreground text-xs font-bold text-background">
                      М{module}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">
                        Модуль {module}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Итоговые оценки по дисциплинам
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-border/45">
                    {moduleSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white shadow-sm"
                            style={{ backgroundColor: subject.color }}
                          >
                            <SubjectIcon
                              subject={subject}
                              className="size-4.5"
                            />
                          </span>

                          <div className="min-w-0">
                            <Link
                              href={`/subjects/${subject.id}`}
                              className="block truncate text-sm font-semibold hover:underline"
                            >
                              {subject.title}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {subjectStatusLabel(subject)} ·{" "}
                              {subject.credits} кр. ·{" "}
                              {formatSubjectModules(subject)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:justify-end">
                          <Label
                            htmlFor={`final-grade-${subject.id}`}
                            className="whitespace-nowrap text-xs text-muted-foreground"
                          >
                            Итог
                          </Label>
                          <Input
                            id={`final-grade-${subject.id}`}
                            type="number"
                            min={0}
                            max={10}
                            step="0.1"
                            value={subject.finalGrade ?? ""}
                            placeholder="—"
                            className="h-9 w-20 text-center font-semibold"
                            style={{
                              borderColor: `${subject.color}66`,
                              boxShadow: `inset 3px 0 0 ${subject.color}`,
                            }}
                            onChange={(event) =>
                              mutate((draft) => {
                                const current = draft.subjects.find(
                                  (item) => item.id === subject.id
                                );
                                if (!current) return;

                                if (event.target.value === "") {
                                  current.finalGrade = null;
                                  return;
                                }

                                current.finalGrade = Math.max(
                                  0,
                                  Math.min(
                                    10,
                                    Number(event.target.value)
                                  )
                                );
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}

                    {!moduleSubjects.length ? (
                      <p className="px-4 py-4 text-sm text-muted-foreground">
                        В этом модуле пока нет дисциплин.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </Panel>
        </section>
      ))}

      {!years.length ? (
        <Panel className="p-6 text-sm text-muted-foreground">
          Добавьте дисциплины — они появятся здесь по курсам и
          модулям.
        </Panel>
      ) : null}
    </main>
  );
}

type ResearchWorkKey = "coursework" | "thesis";

function WorkEditor({
  workKey,
  scope,
}: {
  workKey: ResearchWorkKey;
  scope: Extract<Material["scope"], "coursework" | "thesis">;
}) {
  const { state, mutate } = usePlanner();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);

  const work = state[workKey] as ThesisState;
  const sourceMaterials = Array.isArray(state.materials)
    ? state.materials
    : [];
  const materials = sourceMaterials.filter(
    (item) => item.scope === scope
  );

  const visibleBlocks = Array.isArray(work.blocks)
    ? work.blocks
    : [];

  function updateWork(
    recipe: (current: ThesisState) => void
  ) {
    mutate((draft) => {
      recipe(draft[workKey] as ThesisState);
    });
  }

  function addBlock() {
    updateWork((current) => {
      current.blocks.push({
        id: uid(`${workKey}-block`),
        title: "Новый блок",
        content: "",
      });
    });
  }

  function moveBlock(
    blockId: string,
    direction: -1 | 1
  ) {
    updateWork((current) => {
      const index = current.blocks.findIndex(
        (block) => block.id === blockId
      );
      if (index < 0) return;

      const target = index + direction;
      if (target < 0 || target >= current.blocks.length) return;

      [current.blocks[index], current.blocks[target]] = [
        current.blocks[target],
        current.blocks[index],
      ];
    });
  }

  return (
    <div className="space-y-3.5">
      <Panel>
        <PanelHeader
          title="Файлы и ссылки"
          action={
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLinkOpen(true)}
              >
                <Plus />
                Ссылка
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadOpen(true)}
              >
                <Upload />
                Файл
              </Button>
            </div>
          }
        />

        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {materials.map((item) => (
            <MaterialCard
              key={item.id}
              material={item}
              compact
            />
          ))}

          {!materials.length ? (
            <p className="text-sm text-muted-foreground">
              Пока пусто
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel className="grid gap-4 p-3.5 sm:p-4">
        <div className="grid gap-2">
          <Label htmlFor={`${workKey}-title`}>
            Название работы
          </Label>
          <Input
            id={`${workKey}-title`}
            value={work.title ?? ""}
            onChange={(event) =>
              updateWork((current) => {
                current.title = event.target.value;
              })
            }
            className="h-11 border-border/65 bg-background/45 px-3 text-xl font-semibold shadow-inner sm:text-2xl"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${workKey}-supervisor`}>
            Научный руководитель
          </Label>
          <Input
            id={`${workKey}-supervisor`}
            value={work.supervisor ?? ""}
            onChange={(event) =>
              updateWork((current) => {
                current.supervisor = event.target.value;
              })
            }
            placeholder="ФИО руководителя"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${workKey}-question`}>
            Исследовательский вопрос
          </Label>
          <Textarea
            id={`${workKey}-question`}
            value={work.researchQuestion ?? ""}
            onChange={(event) =>
              updateWork((current) => {
                current.researchQuestion =
                  event.target.value;

                const legacyQuestionBlock =
                  current.blocks.find(
                    (block) =>
                      block.title
                        .trim()
                        .toLocaleLowerCase("ru") ===
                      "исследовательский вопрос"
                  );

                if (legacyQuestionBlock) {
                  legacyQuestionBlock.content =
                    event.target.value;
                }
              })
            }
            className="min-h-24 resize-y"
            placeholder="Сформулируйте исследовательский вопрос"
          />
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-semibold">
          Структура работы
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addBlock}
        >
          <Plus />
          Блок
        </Button>
      </div>

      <div className="space-y-2.5">
        {visibleBlocks.map((block, visibleIndex) => {
          return (
            <Panel
              key={block.id}
              className="group p-3"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor={`${workKey}-block-${block.id}`}
                    className="text-[11px] text-muted-foreground"
                  >
                    Название блока
                  </Label>

                  <div className="relative mt-1">
                    <Input
                      id={`${workKey}-block-${block.id}`}
                      value={block.title}
                      onChange={(event) =>
                        updateWork((current) => {
                          const item =
                            current.blocks.find(
                              (entry) =>
                                entry.id === block.id
                            );
                          if (item) {
                            item.title =
                              event.target.value;
                          }
                        })
                      }
                      className="h-9 border-border/60 bg-background/55 pr-9 text-[15px] font-semibold"
                    />
                    <Pencil className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>

                  <Textarea
                    aria-label={`Содержание ${block.title}`}
                    value={block.content}
                    onChange={(event) =>
                      updateWork((current) => {
                        const item =
                          current.blocks.find(
                            (entry) =>
                              entry.id === block.id
                          );
                        if (item) {
                          item.content =
                            event.target.value;
                        }
                      })
                    }
                    className="mt-2 min-h-24 resize-y border-border/50 bg-muted/25 text-sm leading-6"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={visibleIndex === 0}
                    onClick={() =>
                      moveBlock(block.id, -1)
                    }
                    aria-label="Переместить выше"
                  >
                    <ArrowUp />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={
                      visibleIndex ===
                      visibleBlocks.length - 1
                    }
                    onClick={() =>
                      moveBlock(block.id, 1)
                    }
                    aria-label="Переместить ниже"
                  >
                    <ArrowDown />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() =>
                      updateWork((current) => {
                        current.blocks =
                          current.blocks.filter(
                            (item) =>
                              item.id !== block.id
                          );
                      })
                    }
                    aria-label="Удалить блок"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultScope={scope}
      />
      <MaterialDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        defaultScope={scope}
      />
    </div>
  );
}

export function ResearchWorksView() {
  const [tab, setTab] =
    React.useState<ResearchWorkKey>("coursework");

  return (
    <main className="mx-auto w-full max-w-[1120px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-7 lg:pb-10">
      <PageHeading title="КР и ВКР" />

      <div className="flex w-full gap-1 rounded-[14px] border border-border/60 bg-muted/30 p-1 sm:w-fit">
        <Button
          type="button"
          size="sm"
          variant={
            tab === "coursework"
              ? "default"
              : "ghost"
          }
          className="flex-1 sm:flex-none"
          onClick={() => setTab("coursework")}
        >
          Курсовая 1 курс
        </Button>

        <Button
          type="button"
          size="sm"
          variant={
            tab === "thesis" ? "default" : "ghost"
          }
          className="flex-1 sm:flex-none"
          onClick={() => setTab("thesis")}
        >
          ВКР
        </Button>
      </div>

      {tab === "coursework" ? (
        <WorkEditor
          workKey="coursework"
          scope="coursework"
        />
      ) : (
        <WorkEditor
          workKey="thesis"
          scope="thesis"
        />
      )}
    </main>
  );
}

const activityMeta = {
  magolego: { label: "МагоЛего", icon: Sparkles, color: "#7448D8" }, internship: { label: "Практика", icon: BriefcaseBusiness, color: "#0F8B6D" }, career: { label: "Карьера", icon: GraduationCap, color: "#E04B35" }, club: { label: "Клуб", icon: Users, color: "#2563EB" }, event: { label: "Мероприятие", icon: ActivityIcon, color: "#BF7A00" },
};

export function ActivitiesView({ onAddActivity }: { onAddActivity: () => void }) {
  const { state, mutate } = usePlanner(); const [filter, setFilter] = React.useState("all"); const [selected, setSelected] = React.useState<Activity | null>(null); const sourceActivities = Array.isArray(state.activities) ? state.activities : []; const activities = sourceActivities.filter((item) => filter === "all" || item.category === filter).sort((a, b) => a.date.localeCompare(b.date));
  return <main className="mx-auto w-full max-w-[1300px] space-y-6 px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12"><PageHeading title="Активности" action={<Button onClick={onAddActivity}><Plus />Добавить</Button>} /><div className="flex gap-2 overflow-x-auto pb-1">{[{ value: "all", label: "Все" }, { value: "magolego", label: "МагоЛего" }, { value: "internship", label: "Практика" }, { value: "career", label: "Карьера" }, { value: "club", label: "Клубы" }, { value: "event", label: "События" }].map((item) => <Button key={item.value} variant={filter === item.value ? "default" : "outline"} size="sm" className="shrink-0" onClick={() => setFilter(item.value)}>{item.label}</Button>)}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{activities.map((activity) => { const meta = activityMeta[activity.category]; const Icon = meta.icon; return <Panel key={activity.id} className="group p-5"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ color: meta.color, backgroundColor: `${meta.color}15` }}><Icon className="size-5" /></span><div className="min-w-0 flex-1"><Badge variant="secondary">{meta.label}</Badge><h2 className="mt-3 text-xl font-semibold tracking-[-.03em]">{activity.title}</h2></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 opacity-45 group-hover:opacity-100"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setSelected(activity)}><Pencil />Изменить</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => mutate((draft) => { draft.activities = draft.activities.filter((item) => item.id !== activity.id); })}><Trash2 />Удалить</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>{activity.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{activity.notes}</p> : null}<div className="mt-5 flex items-center gap-2"><Select value={activity.status} onValueChange={(value) => mutate((draft) => { const item = draft.activities.find((current) => current.id === activity.id); if (item) item.status = value as Activity["status"]; })}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todo">Запланировано</SelectItem><SelectItem value="doing">В процессе</SelectItem><SelectItem value="done">Завершено</SelectItem></SelectContent></Select><span className="ml-auto text-sm text-muted-foreground">{format(new Date(activity.date), "d MMM yyyy", { locale: ru })}</span>{activity.link ? <Button asChild variant="ghost" size="icon"><a href={activity.link} target="_blank" rel="noreferrer"><ExternalLink /></a></Button> : null}</div></Panel>; })}</div><ActivityDialog open={Boolean(selected)} onOpenChange={(value) => { if (!value) setSelected(null); }} activity={selected} /></main>;
}

export function SettingsView({ onAddSubject }: { onAddSubject: () => void }) {
  const { state, mutate, removeSubject, exportData, importData, resetData } = usePlanner(); const [editing, setEditing] = React.useState<Subject | null>(null); const importRef = React.useRef<HTMLInputElement>(null);
  return <main className="mx-auto w-full max-w-[1120px] space-y-6 px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-12"><PageHeading title="Настройки" /><Panel><PanelHeader title="Учебный профиль" /><div className="grid gap-5 p-5 sm:grid-cols-2"><div className="grid gap-2"><Label>Имя</Label><Input value={state.profile.name} onChange={(event) => mutate((draft) => { draft.profile.name = event.target.value; })} /></div><div className="grid gap-2"><Label>Программа</Label><Input value={state.profile.program} onChange={(event) => mutate((draft) => { draft.profile.program = event.target.value; })} /></div><div className="grid gap-2"><Label>Учебный год</Label><Input value={state.profile.academicYear} onChange={(event) => mutate((draft) => { draft.profile.academicYear = event.target.value; })} /></div><div className="grid gap-2"><Label>Курс</Label><Input type="number" min="1" max="5" value={state.profile.year} onChange={(event) => mutate((draft) => { draft.profile.year = Number(event.target.value); })} /></div></div></Panel>
    <Panel><PanelHeader title="Дисциплины" action={<Button size="sm" onClick={onAddSubject}><Plus />Добавить</Button>} /><div className="hidden sm:block"><Table><TableHeader><TableRow><TableHead>Предмет</TableHead><TableHead>Тип</TableHead><TableHead>Модули</TableHead><TableHead>Кредиты</TableHead><TableHead className="w-24" /></TableRow></TableHeader><TableBody>{state.subjects.map((subject) => <TableRow key={subject.id}><TableCell><Link href={`/subjects/${subject.id}`} className="flex items-center gap-3 font-medium hover:underline"><SubjectDot subject={subject} />{subject.title}</Link></TableCell><TableCell>{subject.status === "required" ? "Обязательный" : subject.status === "elective" ? "По выбору" : "МагоЛего"}</TableCell><TableCell>{formatSubjectModules(subject)}</TableCell><TableCell>{subject.credits}</TableCell><TableCell><div className="flex justify-end"><Button variant="ghost" size="icon" onClick={() => setEditing(subject)}><Pencil /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить дисциплину?</AlertDialogTitle><AlertDialogDescription>Будут удалены связанные занятия, дедлайны, оценки и материалы.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white" onClick={() => void removeSubject(subject.id)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>)}</TableBody></Table></div><div className="divide-y sm:hidden">{state.subjects.map((subject) => <div key={subject.id} className="flex items-center gap-3 p-3"><span className="grid size-9 place-items-center rounded-xl text-white" style={{ backgroundColor: subject.color }}><SubjectIcon subject={subject} /></span><div className="min-w-0 flex-1"><p className="truncate font-medium">{subject.shortTitle}</p><p className="text-xs text-muted-foreground">{subject.status === "required" ? "Обязательный" : subject.status === "elective" ? "По выбору" : "МагоЛего"} · {formatSubjectModules(subject)}</p></div><Button variant="ghost" size="icon" onClick={() => setEditing(subject)}><Pencil /></Button></div>)}</div></Panel>
    <Panel><PanelHeader title="Оформление" /><div className="grid gap-3 p-5 sm:grid-cols-3">{([{ value: "light", label: "Светлая", icon: Sun }, { value: "dark", label: "Тёмная", icon: Moon }, { value: "system", label: "Как в системе", icon: Settings2 }] as const).map((item) => <button key={item.value} onClick={() => mutate((draft) => { draft.profile.theme = item.value; })} className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left", state.profile.theme === item.value && "border-[#0050CF] bg-[#0050CF]/6")}><item.icon className="size-5" /><span className="font-medium">{item.label}</span>{state.profile.theme === item.value ? <Check className="ml-auto size-4 text-[#0050CF]" /> : null}</button>)}</div></Panel>
    <Panel><PanelHeader title="Резервная копия" /><div className="grid gap-3 p-5 sm:grid-cols-2"><Button variant="outline" className="justify-start" onClick={exportData}><Download />Скачать JSON</Button><input ref={importRef} type="file" accept="application/json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importData(file); event.target.value = ""; }} /><Button variant="outline" className="justify-start" onClick={() => importRef.current?.click()}><Upload />Восстановить из JSON</Button></div><div className="border-t border-border/60 p-5"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive"><RefreshCcw />Сбросить данные</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Сбросить весь планер?</AlertDialogTitle><AlertDialogDescription>Текущие данные будут заменены исходным шаблоном.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white" onClick={() => void resetData()}>Сбросить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></Panel><SubjectDialog open={Boolean(editing)} onOpenChange={(value) => { if (!value) setEditing(null); }} subject={editing} /></main>;
}
