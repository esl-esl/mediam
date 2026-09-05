import { createSeedState } from "./planner-seed";
import type { AssessmentFormat, CourseTopic, PlannerState, SubjectIconKey } from "./planner-types";
import { inferSubjectIcon, subjectIconKeys } from "./subject-icons";

const validIcons = new Set<SubjectIconKey>(subjectIconKeys);
const validAssessmentFormats = new Set<AssessmentFormat>(["none", "numeric", "plusminus", "text"]);

function uniqueModules(modules: unknown, fallback: number) {
  const source = Array.isArray(modules) ? modules : [fallback];
  const result = [...new Set(source.map(Number).filter((item) => item >= 1 && item <= 4))].sort();
  return result.length ? result : [Math.max(1, Math.min(4, fallback || 1))];
}

export function normalizePlannerState(value: unknown): PlannerState {
  const seed = createSeedState();
  if (!value || typeof value !== "object") return seed;
  const raw = value as Partial<PlannerState> & Record<string, unknown>;
  const subjects = (Array.isArray(raw.subjects) ? raw.subjects : seed.subjects).map((subject) => {
    const candidate = subject as PlannerState["subjects"][number] & { status?: string };
    const status = candidate.status === "university" ? "magolego" : candidate.status;
    const primaryModule = Number(candidate.module) || 1;
    return {
      ...candidate,
      module: primaryModule,
      modules: uniqueModules(candidate.modules, primaryModule),
      icon: candidate.icon && validIcons.has(candidate.icon) ? candidate.icon : inferSubjectIcon(candidate.title || candidate.shortTitle || ""),
      status: status === "elective" || status === "magolego" ? status : "required",
      objectives: candidate.objectives ?? [], scheduleLabel: candidate.scheduleLabel ?? "", room: candidate.room ?? "",
      description: candidate.description ?? "", roundingRule: candidate.roundingRule ?? "math", pinned: candidate.pinned ?? false,
    };
  });
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const rawLessons = Array.isArray(raw.lessons) && raw.lessons.length ? raw.lessons : seed.lessons.filter((lesson) => subjectIds.has(lesson.subjectId));
  const topics: CourseTopic[] = (Array.isArray(raw.topics) && raw.topics.length ? raw.topics : []).map((topic) => ({ ...topic, notes: topic.notes ?? "" }));
  const topicIds = new Set(topics.map((topic) => topic.id));
  const migratedTopics = new Map<string, string>();

  const lessons = rawLessons.map((lesson, index) => {
    let linked = Array.isArray(lesson.topicIds) ? lesson.topicIds.filter((id) => topicIds.has(id)) : [];
    if (!linked.length && lesson.topic?.trim()) {
      const key = `${lesson.subjectId}:${lesson.topic.trim().toLocaleLowerCase("ru")}`;
      let topicId = migratedTopics.get(key) ?? topics.find((topic) => topic.subjectId === lesson.subjectId && topic.title.toLocaleLowerCase("ru") === lesson.topic!.trim().toLocaleLowerCase("ru"))?.id;
      if (!topicId) {
        topicId = `topic-${lesson.id}`;
        topics.push({ id: topicId, subjectId: lesson.subjectId, title: lesson.topic.trim(), notes: "" });
        topicIds.add(topicId);
      }
      migratedTopics.set(key, topicId);
      linked = [topicId];
    }
    const legacyGrade = lesson.grade ?? null;
    const assessmentFormat = validAssessmentFormats.has(lesson.assessmentFormat) ? lesson.assessmentFormat : "numeric";
    return {
      ...lesson,
      number: lesson.number ?? index + 1,
      kind: lesson.kind ?? "seminar",
      title: lesson.title ?? `${lesson.kind === "lecture" ? "Лекция" : lesson.kind === "nis" ? "НИС" : lesson.kind === "control" ? "Контрольная" : lesson.kind === "exam" ? "Экзамен" : lesson.kind === "workshop" ? "Практическое занятие" : "Семинар"} ${lesson.number ?? index + 1}`,
      topicIds: linked,
      assessmentFormat,
      assessmentValue: lesson.assessmentValue ?? (legacyGrade === null ? "" : String(legacyGrade)),
      assessmentMin: lesson.assessmentMin ?? 0,
      assessmentMax: lesson.assessmentMax ?? 10,
      grade: legacyGrade,
      notes: lesson.notes ?? "",
    };
  });
  const oldThesis = raw.thesis && typeof raw.thesis === "object" ? raw.thesis : seed.thesis;
  const blocks = Array.isArray(oldThesis.blocks) && oldThesis.blocks.length ? oldThesis.blocks : [
    ...(oldThesis.researchQuestion ? [{ id: "thesis-question", title: "Исследовательский вопрос", content: oldThesis.researchQuestion }] : []),
    { id: "thesis-tasks", title: "Задачи исследования", content: "" },
  ];

  return {
    profile: { ...seed.profile, ...(raw.profile ?? {}) }, subjects,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : seed.tasks,
    grades: (Array.isArray(raw.grades) ? raw.grades : seed.grades).map((part) => ({ ...part, calculation: part.calculation ?? "single", scoreFormat: part.scoreFormat ?? "numeric", scoreText: part.scoreText ?? "", minScore: part.minScore ?? 0 })),
    topics, lessons,
    notes: (Array.isArray(raw.notes) ? raw.notes : seed.notes).map((note) => ({
      ...note,
      body: note.body ?? "",
      format: note.format === "link" ? "link" : "text",
      url: note.url ?? "",
      lessonIds: Array.isArray(note.lessonIds) ? note.lessonIds : [],
      topicIds: Array.isArray(note.topicIds) ? note.topicIds : [],
    })),
    schedule: Array.isArray(raw.schedule) ? raw.schedule : [],
    materials: (Array.isArray(raw.materials) ? raw.materials : seed.materials).map((material) => ({
      ...material,
      scope: material.scope ?? (material.subjectId ? "subject" : "general"),
      lessonId: material.lessonId ?? null,
      topicId: material.topicId ?? null,
      lessonIds: Array.isArray(material.lessonIds) ? material.lessonIds : material.lessonId ? [material.lessonId] : [],
      topicIds: Array.isArray(material.topicIds) ? material.topicIds : material.topicId ? [material.topicId] : [],
    })),
    thesis: { ...oldThesis, title: oldThesis.title ?? "Магистерская диссертация", blocks },
    activities: Array.isArray(raw.activities) ? raw.activities : seed.activities,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : seed.sessions,
  };
}
