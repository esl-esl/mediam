import { createSeedState } from "./planner-seed";
import type { PlannerState } from "./planner-types";

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function ensurePlannerState(
  input: PlannerState | Partial<PlannerState> | null | undefined
): PlannerState {
  const seed = createSeedState();
  const raw = (input ?? {}) as Partial<PlannerState>;

  const thesis = raw.thesis ?? seed.thesis;

  return {
    ...seed,
    ...raw,

    profile: {
      ...seed.profile,
      ...(raw.profile ?? {}),
    },

    subjects: safeArray(raw.subjects).map((subject) => ({
      ...subject,
      modules:
        Array.isArray(subject.modules) && subject.modules.length
          ? subject.modules
          : [subject.module ?? 1],
      objectives: safeArray(subject.objectives),
    })),

    tasks: safeArray(raw.tasks).map((task) => ({
      ...task,
      subtasks: safeArray(task.subtasks),
    })),

    grades: safeArray(raw.grades),

    topics: safeArray(raw.topics),

    lessons: safeArray(raw.lessons).map((lesson) => ({
      ...lesson,
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

    thesis: {
      ...seed.thesis,
      ...thesis,
      title: thesis?.title ?? "Магистерская диссертация",
      blocks: safeArray(thesis?.blocks),
      chapters: safeArray(thesis?.chapters),
      milestones: safeArray(thesis?.milestones),
    },

    activities: safeArray(raw.activities),

    sessions: safeArray(raw.sessions),
  };
}
