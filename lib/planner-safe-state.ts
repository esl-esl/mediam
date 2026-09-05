import { createSeedState } from "./planner-seed";
import type { PlannerState, ThesisState } from "./planner-types";

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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
    lessons: safeArray(raw.lessons).map((lesson) => ({
      ...lesson,
      kind: lesson.kind ?? "seminar",
      topicIds: safeArray(lesson.topicIds),
      assessmentFormat: lesson.assessmentFormat ?? "numeric",
      assessmentValue: String(lesson.assessmentValue ?? ""),
      assessmentMin: lesson.assessmentMin ?? 0,
      assessmentMax: lesson.assessmentMax ?? 10,
      notes: lesson.notes ?? "",
    })),
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
    coursework: safeWork(raw.coursework, seed.coursework),
    thesis: safeWork(raw.thesis, seed.thesis),
    activities: safeArray(raw.activities),
    sessions: safeArray(raw.sessions),
  };
}
