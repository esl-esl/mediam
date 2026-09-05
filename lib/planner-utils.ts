import type { AssessmentFormat, CourseLesson, GradeComponent, LessonKind, PlannerState, StudyTask, Subject } from "./planner-types";

export const taskStatusLabels = {
  todo: "Нужно сделать",
  doing: "В работе",
  done: "Готово",
} as const;

export const priorityLabels = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
} as const;

export const taskTypeLabels = {
  lecture: "Лекция",
  seminar: "Семинар",
  homework: "Домашнее задание",
  exam: "Экзамен",
  project: "Проект",
  reading: "Чтение",
  other: "Другое",
} as const;

export const lessonKindLabels: Record<LessonKind, string> = {
  lecture: "Лекция",
  seminar: "Семинар",
  nis: "НИС",
  control: "Контрольная",
  exam: "Экзамен",
  workshop: "Практическое занятие",
};

export const assessmentFormatLabels: Record<AssessmentFormat, string> = {
  none: "Без оценки",
  numeric: "Число",
  plusminus: "+ / ± / −",
  text: "Текст",
};

export function subjectModules(subject: Subject) {
  const modules = subject.modules?.length ? subject.modules : [subject.module];
  return [...new Set(modules.filter((item) => item >= 1 && item <= 4))].sort();
}

export function formatSubjectModules(subject: Subject) {
  const modules = subjectModules(subject);
  if (modules.length === 4) return "М1–4";
  if (modules.length > 1 && modules.every((value, index) => index === 0 || value === modules[index - 1] + 1)) return `М${modules[0]}–${modules.at(-1)}`;
  return modules.map((module) => `М${module}`).join(", ");
}

export function assessmentValueLabel(format: AssessmentFormat, value: string, min = 0, max = 10) {
  if (format === "none" || !value.trim()) return "—";
  if (format === "numeric") return `${value} / ${max}${min ? ` (от ${min})` : ""}`;
  return value;
}

function normalizedNumericScore(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return Math.max(0, Math.min(10, ((value - min) / (max - min)) * 10));
}

export function gradeComponentScore(part: GradeComponent, lessons: CourseLesson[] = []) {
  if (part.calculation !== "lesson_average") {
    if ((part.scoreFormat ?? "numeric") !== "numeric" || part.score === null) return null;
    return normalizedNumericScore(part.score, part.minScore ?? 0, part.maxScore);
  }
  const scores = lessons
    .filter((lesson) => lesson.subjectId === part.subjectId && (!part.lessonKind || lesson.kind === part.lessonKind) && lesson.assessmentFormat === "numeric" && lesson.assessmentValue.trim())
    .map((lesson) => normalizedNumericScore(Number(lesson.assessmentValue), lesson.assessmentMin ?? 0, lesson.assessmentMax ?? 10))
    .filter((score): score is number => score !== null);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

export function gradeForSubject(subjectId: string, grades: GradeComponent[], lessons: CourseLesson[] = []) {
  const parts = grades.filter((part) => part.subjectId === subjectId);
  const earned = parts.reduce((sum, part) => {
    const score = gradeComponentScore(part, lessons);
    if (score === null) return sum;
    return sum + score * part.weight;
  }, 0);
  const completedWeight = parts.reduce(
    (sum, part) => sum + (gradeComponentScore(part, lessons) === null ? 0 : part.weight),
    0,
  );
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  const forecast = completedWeight > 0 ? earned / completedWeight : 0;
  return { earned, completedWeight, totalWeight, forecast, parts };
}

export function requiredAverage(subject: Subject, grades: GradeComponent[], lessons: CourseLesson[] = []) {
  const { earned, completedWeight } = gradeForSubject(subject.id, grades, lessons);
  const remaining = Math.max(0, 1 - completedWeight);
  if (!remaining) return null;
  return Math.max(0, Math.min(10, ((subject.targetGrade ?? 10) - earned) / remaining));
}

export function roundedGrade(value: number, rule: Subject["roundingRule"]) {
  if (rule === "none") return Math.round(value * 100) / 100;
  if (rule === "hse07") {
    const integer = Math.floor(value);
    return value - integer >= 0.7 ? Math.min(10, integer + 1) : integer;
  }
  return Math.round(value);
}

export function subjectById(state: PlannerState, id: string | null) {
  return state.subjects.find((subject) => subject.id === id);
}

export function dateOnly(value: string) {
  return value.slice(0, 10);
}

export function isOverdue(task: StudyTask) {
  return task.status !== "done" && new Date(task.dueDate).getTime() < Date.now();
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export function formatFileSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function uid(prefix = "item") {
  return `${prefix}-${crypto.randomUUID()}`;
}
