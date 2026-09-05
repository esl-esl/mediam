import { createSeedState } from "./planner-seed";
import type { DiplomaGradeEntry, PlannerState, ThesisState } from "./planner-types";

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeLessonNumbers(value: unknown, fallback: number): number[] {
  const source = Array.isArray(value) ? value : [fallback];
  const numbers = [
    ...new Set(
      source
        .map(Number)
        .filter((item) => Number.isInteger(item) && item > 0)
    ),
  ].sort((a, b) => a - b);

  return numbers.length ? numbers : [Math.max(1, fallback || 1)];
}

function safeDiplomaGrades(
  value: DiplomaGradeEntry[] | null | undefined
): DiplomaGradeEntry[] {
  return safeArray(value).map((item, index) => {
    const year = Number(item.year) === 2 ? 2 : 1;

    return {
      id: item.id || `diploma-grade-${year}-${index + 1}`,
      year: year as 1 | 2,
      subjectTitle: String(item.subjectTitle ?? ""),
      grade:
        item.grade === null || item.grade === undefined
          ? null
          : Math.max(0, Math.min(10, Number(item.grade))),
    };
  });
}

function safeWork(
  value: ThesisState | Partial<ThesisState> | null | undefined,
  seed: ThesisState
): ThesisState {
  const raw = value ?? seed;

  return {
    ...seed,
    ...raw,
    title: String(raw.title ?? seed.title),
    supervisor: String(raw.supervisor ?? seed.supervisor ?? ""),
    stage: String(raw.stage ?? seed.stage ?? ""),
    researchQuestion: String(
      raw.researchQuestion ?? seed.researchQuestion ?? ""
    ),
    blocks: safeArray(raw.blocks),
    chapters: safeArray(raw.chapters),
    milestones: safeArray(raw.milestones),
  };
}

export function ensurePlannerState(
  input:
    | PlannerState
    | Partial<PlannerState>
    | null
    | undefined
): PlannerState {
  const seed = createSeedState();
  const raw = (input ?? {}) as Partial<PlannerState>;

  return {
    ...seed,
    ...raw,
    profile: {
      ...seed.profile,
      ...(raw.profile ?? {}),
    },
    subjects: safeArray(raw.subjects).map((subject) => ({
      ...subject,
      color: subject.color || "#2563EB",
      modules:
        Array.isArray(subject.modules) && subject.modules.length
          ? subject.modules
          : [subject.module ?? 1],
      objectives: safeArray(subject.objectives),
      finalGrade:
        subject.finalGrade === null ||
        subject.finalGrade === undefined
          ? null
          : Math.max(0, Math.min(10, Number(subject.finalGrade))),
    })),
    tasks: safeArray(raw.tasks).map((task) => ({
      ...task,
      subtasks: safeArray(task.subtasks),
    })),
    grades: safeArray(raw.grades),
    topics: safeArray(raw.topics),
    lessons: safeArray(raw.lessons).map((lesson, index) => {
      const fallbackNumber = Number(lesson.number) || index + 1;
      const numbers = safeLessonNumbers(
        (lesson as typeof lesson & { numbers?: unknown }).numbers,
        fallbackNumber
      );
      const {
        deadline: _legacyLessonDeadline,
        ...lessonWithoutLegacyDeadline
      } = lesson as typeof lesson & { deadline?: unknown };

      void _legacyLessonDeadline;

      return {
        ...lessonWithoutLegacyDeadline,
        number: numbers[0],
        numbers,
        kind: lesson.kind ?? "seminar",
        topicIds: safeArray(lesson.topicIds),
        assessmentFormat: lesson.assessmentFormat ?? "numeric",
        assessmentValue: String(lesson.assessmentValue ?? ""),
        assessmentMin: lesson.assessmentMin ?? 0,
        assessmentMax: lesson.assessmentMax ?? 10,
        notes: lesson.notes ?? "",
      };
    }),
    notes: safeArray(raw.notes).map((note) => ({
      ...note,
      tags: safeArray(note.tags),
      lessonIds: safeArray(note.lessonIds),
      topicIds: safeArray(note.topicIds),
      body: note.body ?? "",
    })),
    schedule: safeArray(raw.schedule),
    materials: safeArray(raw.materials).map((material) => ({
      ...material,
      lessonIds: safeArray(material.lessonIds),
      topicIds: safeArray(material.topicIds),
    })),
    diplomaGrades: safeDiplomaGrades(raw.diplomaGrades),
    coursework: safeWork(raw.coursework, seed.coursework),
    thesis: safeWork(raw.thesis, seed.thesis),
    activities: safeArray(raw.activities),
    sessions: safeArray(raw.sessions),
  };
}
