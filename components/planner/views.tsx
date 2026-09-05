"use client";

import * as React from "react";
import { DashboardView } from "./views-dashboard";
import { GradesView, MaterialsView } from "./views-grades-materials";
import { ActivitiesView, SettingsView, ThesisView } from "./views-growth";
import { SubjectView } from "./views-subject";
import { CalendarView, TasksView } from "./views-tasks-calendar";
import { AnalyticsView } from "./views-analytics";

interface PlannerViewProps {
  route: string[];
  onAddTask: () => void;
  onAddSubject: () => void;
  onAddNote: () => void;
  onAddActivity: () => void;
}

class PlannerViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Planner view render failed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5">
            <h1 className="text-lg font-semibold">
              Не удалось открыть раздел
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ошибка интерфейса перехвачена — остальные данные планера не повреждены.
            </p>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-background/70 p-3 text-xs">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="mt-4 rounded-lg border px-3 py-2 text-sm font-medium"
              onClick={() => this.setState({ error: null })}
            >
              Попробовать ещё раз
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export function PlannerView({
  route,
  onAddTask,
  onAddSubject,
  onAddActivity,
}: PlannerViewProps) {
  const [section = "dashboard", id] = route;

  let view: React.ReactNode;

  switch (section) {
    case "calendar":
      view = <CalendarView onAddTask={onAddTask} />;
      break;
    case "tasks":
      view = <TasksView onAddTask={onAddTask} />;
      break;
    case "grades":
      view = <GradesView />;
      break;
    case "materials":
      view = <MaterialsView />;
      break;
    case "thesis":
    case "diploma":
      view = <ThesisView />;
      break;
    case "activities":
      view = <ActivitiesView onAddActivity={onAddActivity} />;
      break;
    case "analytics":
      view = <AnalyticsView />;
      break;
    case "settings":
      view = <SettingsView onAddSubject={onAddSubject} />;
      break;
    case "subjects":
      view = <SubjectView subjectId={id ?? ""} />;
      break;
    default:
      view = (
        <DashboardView
          onAddTask={onAddTask}
          onAddSubject={onAddSubject}
        />
      );
  }

  return (
    <PlannerViewErrorBoundary key={route.join("/") || "dashboard"}>
      {view}
    </PlannerViewErrorBoundary>
  );
}
