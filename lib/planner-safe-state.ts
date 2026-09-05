import type { PlannerState } from "./planner-types";
import { createSeedState } from "./planner-seed";

function array<T>(value: T[] | null | undefined): T[] {
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

    subjects: array(raw.subjects).map((subject) => ({
      ...subject,
      modules:
        Array.isArray(subject.modules) && subject.modules.length
          ? subject.modules
          : [subject.module],
      objectives: array(subject.objectives),
    })),

    tasks: array(raw.tasks).map((task) => ({
      ...task,
      subtasks: array(task.subtasks),
    })),

    grades: array(raw.grades),

    topics: array(raw.topics),

    lessons: array(raw.lessons).map((lesson) => ({
      ...lesson,
      topicIds: array(lesson.topicIds),
      assessmentFormat: lesson.assessmentFormat ?? "numeric",
      assessmentValue: String(lesson.assessmentValue ?? ""),
      assessmentMin: lesson.assessmentMin ?? 0,
      assessmentMax: lesson.assessmentMax ?? 10,
      notes: lesson.notes ?? "",
    })),

    notes: array(raw.notes).map((note) => ({
      ...note,
      tags: array(note.tags),
      lessonIds: array(note.lessonIds),
      topicIds: array(note.topicIds),
      body: note.body ?? "",
    })),

    schedule: array(raw.schedule),

    materials: array(raw.materials).map((material) => ({
      ...material,
      lessonIds: array(material.lessonIds),
      topicIds: array(material.topicIds),
    })),

    thesis: {
      ...seed.thesis,
      ...thesis,
      title: thesis?.title ?? "Магистерская диссертация",
      blocks: array(thesis?.blocks),
      chapters: array(thesis?.chapters),
      milestones: array(thesis?.milestones),
    },

    activities: array(raw.activities),

    sessions: array(raw.sessions),
  };
}
