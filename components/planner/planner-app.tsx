"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, CheckCircle2, ChevronRight,
  CircleUserRound, Cloud, CloudOff, FileStack, FolderOpen, GraduationCap, Home, LibraryBig,
  Layers3, ListTodo, LoaderCircle, Monitor, Moon, Plus, ScrollText, Search, Settings2, Sparkles, Sun, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PlannerProvider, usePlanner } from "./planner-provider";
import { ActivityDialog, MaterialDialog, NoteDialog, SubjectDialog, TaskDialog } from "./editor-dialogs";
import { PlannerView } from "./views";
import { cn } from "@/lib/utils";
import { compareSubjectsByStudyOrder, formatSubjectModules, subjectModules } from "@/lib/planner-utils";
import { academicCalendarState, currentAcademicCourse } from "@/lib/academic-calendar";
import { useClientNow } from "@/lib/use-client-now";
import { SubjectIcon } from "./subject-icon";
import { MobileStartup } from "./mobile-startup";

const mainNav = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/courses", label: "Модули и курсы", icon: Layers3 },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/tasks", label: "Задачи", icon: ListTodo },
  { href: "/grades", label: "Оценки", icon: GraduationCap },
  { href: "/materials", label: "Материалы", icon: FolderOpen },
];

const growthNav = [
  { href: "/analytics", label: "Аналитика", icon: ChartNoAxesColumnIncreasing },
  { href: "/diploma", label: "Диплом", icon: ScrollText },
  { href: "/thesis", label: "КР и ВКР", icon: GraduationCap },
  { href: "/activities", label: "Активности", icon: Sparkles },
];

class PlannerErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("Study Space render failed", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="grid min-h-dvh place-items-center bg-white px-5 text-[#111827] dark:bg-[#111a2b] dark:text-white"><div className="w-full max-w-sm text-center"><div className="mx-auto grid size-14 place-items-center bg-[#0050CF] text-lg font-black text-white">ВШЭ</div><h1 className="mt-5 text-xl font-semibold">Не удалось открыть Study Space</h1><p className="mt-2 text-sm text-muted-foreground">Данные не удалены. Обновите страницу — приложение восстановит соединение.</p><button className="mt-5 h-11 w-full rounded-xl bg-[#0050CF] px-4 font-semibold text-white" onClick={() => window.location.reload()}>Обновить</button></div></main>;
  }
}

function routeTitle(pathname: string, subjects: ReturnType<typeof usePlanner>["state"]["subjects"]) {
  if (pathname === "/") return "Главная";
  if (pathname.startsWith("/subjects/")) return subjects.find((item) => pathname.endsWith(item.id))?.shortTitle ?? "Дисциплина";
  return [...mainNav, ...growthNav, { href: "/settings", label: "Настройки", icon: Settings2 }].find((item) => item.href === pathname)?.label ?? "Study Planner";
}

function SyncIndicator() {
  const { syncStatus, updatedAt } = usePlanner();
  const config = {
    loading: { icon: LoaderCircle, label: "Загрузка", className: "animate-spin" },
    saving: { icon: Cloud, label: "Сохраняю", className: "animate-pulse" },
    saved: { icon: CheckCircle2, label: "Сохранено", className: "" },
    offline: { icon: WifiOff, label: "Локальный режим", className: "" },
    error: { icon: CloudOff, label: "Не сохранено", className: "" },
  }[syncStatus];
  const Icon = config.icon;
  return (
    <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex" title={updatedAt ? `Последнее сохранение: ${new Date(updatedAt).toLocaleString("ru-RU")}` : undefined}>
      <Icon className={cn("size-4", config.className)} />
      <span>{config.label}</span>
    </div>
  );
}

function AppSidebar({ pathname }: { pathname: string }) {
  const { state } = usePlanner();
  const activeCourse = currentAcademicCourse();
  const now = useClientNow();
  const calendar = academicCalendarState(now, activeCourse);
  const activeModule = calendar.current?.module ?? calendar.next?.module;
  const visibleSubjects = state.subjects
    .filter((subject) => subject.year === activeCourse && (!activeModule || subjectModules(subject).includes(activeModule)))
    .sort(compareSubjectsByStudyOrder);
  return (
    <Sidebar collapsible="icon" className="overflow-x-hidden border-r-0 [&_[data-slot=sidebar-inner]]:overflow-x-hidden">
      <SidebarHeader className="px-3 pt-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-2">
          <span className="grid size-10 shrink-0 place-items-center bg-[#0050CF] text-[17px] font-black tracking-[-.08em] text-white shadow-[0_8px_20px_rgba(0,80,207,.25)]">ВШЭ</span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[15px] font-semibold">Study Space</span>
            <span className="block truncate text-xs text-sidebar-foreground/55">{state.profile.program}</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className="h-9 rounded-lg">
                    <Link href={item.href}><item.icon /><span>{item.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-2" />
        <SidebarGroup>
          <SidebarGroupLabel>{activeModule ? `${activeCourse} курс · модуль ${activeModule}` : `${activeCourse} курс`}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSubjects.map((subject) => (
                <SidebarMenuItem key={subject.id}>
                  <SidebarMenuButton asChild isActive={pathname === `/subjects/${subject.id}`} tooltip={subject.shortTitle} className="h-9 rounded-lg">
                    <Link href={`/subjects/${subject.id}`} className="min-w-0 overflow-hidden"><span className="grid size-5 shrink-0 place-items-center rounded-md text-white" style={{ backgroundColor: subject.color }}><SubjectIcon subject={subject} className="size-3" /></span><span className="truncate">{subject.shortTitle}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {!visibleSubjects.length ? <SidebarMenuItem><SidebarMenuButton asChild tooltip="Модули и курсы" className="h-9 rounded-lg"><Link href="/courses"><Layers3 /><span>Все дисциплины</span></Link></SidebarMenuButton></SidebarMenuItem> : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-2" />
        <SidebarGroup>
          <SidebarGroupLabel>Развитие</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {growthNav.map((item) => <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className="h-9 rounded-lg"><Link href={item.href}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Настройки" className="h-10 rounded-lg"><Link href="/settings"><CircleUserRound /><span className="truncate">{state.profile.name}</span><Settings2 className="ml-auto opacity-50" /></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state } = usePlanner();
  const router = useRouter();
  const select = (href: string) => { onOpenChange(false); router.push(href); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Поиск" description="Найдите предмет, задачу, конспект или раздел">
      <CommandInput placeholder="Что найти?" />
      <CommandList>
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        <CommandGroup heading="Разделы">
          {[...mainNav, ...growthNav].map((item) => <CommandItem key={item.href} value={item.label} onSelect={() => select(item.href)}><item.icon />{item.label}</CommandItem>)}
        </CommandGroup>
        <CommandGroup heading="Дисциплины">
          {state.subjects.slice().sort(compareSubjectsByStudyOrder).map((subject) => <CommandItem key={subject.id} value={`${subject.title} ${subject.shortTitle}`} onSelect={() => select(`/subjects/${subject.id}`)}><span className="size-3 rounded-sm" style={{ backgroundColor: subject.color }} />{subject.title}<CommandShortcut>{subject.year} курс · {subject.status === "elective" ? "по выбору" : subject.status === "magolego" ? "МагоЛего" : formatSubjectModules(subject)}</CommandShortcut></CommandItem>)}
        </CommandGroup>
        <CommandGroup heading="Задачи">
          {state.tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 12).map((task) => <CommandItem key={task.id} value={task.title} onSelect={() => select(`/tasks?task=${task.id}`)}><ListTodo />{task.title}<CommandShortcut>{new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</CommandShortcut></CommandItem>)}
        </CommandGroup>
        <CommandGroup heading="Конспекты">
          {state.notes.map((note) => <CommandItem key={note.id} value={`${note.title} ${note.body}`} onSelect={() => select(note.subjectId ? `/subjects/${note.subjectId}#materials` : "/materials")}><BookOpen />{note.title}</CommandItem>)}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function Workspace({ initialRoute }: { initialRoute: string[] }) {
  const pathname = usePathname();
  const { state, mutate } = usePlanner();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [subjectOpen, setSubjectOpen] = React.useState(false);
  const [materialOpen, setMaterialOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const title = routeTitle(pathname, state.subjects);
  const themeOptions = [{ value: "light", label: "Светлая", icon: Sun }, { value: "dark", label: "Тёмная", icon: Moon }, { value: "system", label: "Как в системе", icon: Monitor }] as const;
  const ThemeIcon = themeOptions.find((item) => item.value === state.profile.theme)?.icon ?? Monitor;

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar pathname={pathname} />
      <SidebarInset className="min-w-0 bg-[var(--workspace)]">
        <header className="app-shell-header sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/80 bg-white/85 px-3 backdrop-blur-xl sm:px-5 dark:border-white/8 dark:bg-[#111a2b]/88">
          <SidebarTrigger className="size-9 rounded-lg" />
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{state.profile.academicYear}</span>
            <ChevronRight className="hidden size-4 text-muted-foreground/50 sm:block" />
            <span className="truncate font-medium">{title}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SyncIndicator />
            <Button variant="outline" size="sm" className="hidden min-w-48 justify-between rounded-lg text-muted-foreground lg:flex" onClick={() => setSearchOpen(true)}><span className="flex items-center gap-2"><Search className="size-4" />Поиск</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">⌘K</kbd></Button>
            <Button variant="ghost" size="icon" className="rounded-lg lg:hidden" onClick={() => setSearchOpen(true)} aria-label="Поиск"><Search /></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-lg" aria-label="Тема"><ThemeIcon /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Оформление</DropdownMenuLabel>{themeOptions.map((item) => <DropdownMenuItem key={item.value} onSelect={() => mutate((draft) => { draft.profile.theme = item.value; })}><item.icon />{item.label}{state.profile.theme === item.value ? <span className="ml-auto text-[#0050CF]">✓</span> : null}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" className="rounded-lg bg-[#0050CF] hover:bg-[#0045B5]"><Plus /> <span className="hidden sm:inline">Добавить</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>Быстрое создание</DropdownMenuLabel><DropdownMenuItem onSelect={() => setTaskOpen(true)}><ListTodo />Задачу</DropdownMenuItem><DropdownMenuItem onSelect={() => setNoteOpen(true)}><BookOpen />Конспект</DropdownMenuItem><DropdownMenuItem onSelect={() => setMaterialOpen(true)}><LibraryBig />Ссылку или источник</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setSubjectOpen(true)}><FileStack />Дисциплину</DropdownMenuItem><DropdownMenuItem onSelect={() => setActivityOpen(true)}><Activity />Активность</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <PlannerView route={initialRoute} onAddTask={() => setTaskOpen(true)} onAddSubject={() => setSubjectOpen(true)} onAddNote={() => setNoteOpen(true)} onAddActivity={() => setActivityOpen(true)} />
        <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-border/80 bg-white/90 p-1.5 shadow-[0_16px_50px_rgba(15,23,42,.18)] backdrop-blur-xl md:hidden dark:bg-[#182235]/90">
          {[mainNav[0], mainNav[2], mainNav[3], mainNav[5], mainNav[4]].map((item) => <Link key={item.href} href={item.href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] text-muted-foreground", pathname === item.href && "bg-[#0050CF]/10 text-[#0050CF]")}><item.icon className="size-5" /><span className="truncate">{item.label}</span></Link>)}
        </nav>
        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
        <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
        <SubjectDialog open={subjectOpen} onOpenChange={setSubjectOpen} />
        <MaterialDialog open={materialOpen} onOpenChange={setMaterialOpen} />
        <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} />
        <ActivityDialog open={activityOpen} onOpenChange={setActivityOpen} />
      </SidebarInset>
      <Toaster position="bottom-right" richColors />
    </SidebarProvider>
  );
}

export function PlannerApp({ initialRoute }: { initialRoute: string[] }) {
  return <PlannerErrorBoundary><PlannerProvider><MobileStartup /><Workspace initialRoute={initialRoute} /></PlannerProvider></PlannerErrorBoundary>;
}
