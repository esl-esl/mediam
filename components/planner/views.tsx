"use client";

import { CoursesView, DashboardView } from "./views-dashboard";
import { GradesView, MaterialsView } from "./views-grades-materials";
import { ActivitiesView, DiplomaView, SettingsView, ThesisView } from "./views-growth";
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

export function PlannerView({
  route,
  onAddTask,
  onAddSubject,
  onAddActivity,
}: PlannerViewProps) {
  const [section = "dashboard", id] = route;

  switch (section) {
    case "calendar": return <CalendarView onAddTask={onAddTask} />;
    case "courses": return <CoursesView onAddSubject={onAddSubject} />;
    case "tasks": return <TasksView onAddTask={onAddTask} />;
    case "grades": return <GradesView />;
    case "materials": return <MaterialsView />;
    case "thesis": return <ThesisView />;
    case "diploma": return <DiplomaView />;
    case "activities": return <ActivitiesView onAddActivity={onAddActivity} />;
    case "analytics": return <AnalyticsView />;
    case "settings": return <SettingsView onAddSubject={onAddSubject} />;
    case "subjects": return <SubjectView subjectId={id ?? ""} />;
    default: return <DashboardView onAddTask={onAddTask} onAddSubject={onAddSubject} />;
  }
}
