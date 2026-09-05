import { createSeedState } from "./planner-seed";
import type { AssessmentFormat, CourseTopic, DiplomaGrade, PlannerState, SubjectIconKey, ThesisState } from "./planner-types";
import { sortPlannerCollections } from "./planner-utils";
import { inferSubjectIcon, subjectIconKeys } from "./subject-icons";

const validIcons = new Set<SubjectIconKey>(subjectIconKeys);
const validAssessmentFormats = new Set<AssessmentFormat>(["none", "numeric", "plusminus", "text"]);
const refreshedCourseColors: Record<string, string> = {
  "#2563EB": "#0050CF",
  "#7448D8": "#7C3AED",
  "#E04B35": "#F04438",
  "#0F8B6D": "#00A878",
  "#BF7A00": "#E0A000",
  "#C23B72": "#E53683",
  "#0E7490": "#008ED6",
  "#475569": "#00A6B2",
  "#DC2626": "#F04438",
};

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
      color: refreshedCourseColors[String(candidate.color).toUpperCase()] ?? candidate.color ?? "#0050CF",
      module: primaryModule,
      modules: uniqueModules(candidate.modules, primaryModule),
      year: Math.max(1, Math.min(2, Number(candidate.year) || 1)),
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
      numberEnd: lesson.numberEnd && lesson.numberEnd > (lesson.number ?? index + 1) ? lesson.numberEnd : undefined,
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
  const normalizeWork = (work: ThesisState | undefined, fallback: ThesisState, prefix: string): ThesisState => {
    const source = work && typeof work === "object" ? work : fallback;
    const blocks = Array.isArray(source.blocks) && source.blocks.length ? source.blocks : [
      ...(source.researchQuestion ? [{ id: `${prefix}-question`, title: "Исследовательский вопрос", content: source.researchQuestion }] : []),
      { id: `${prefix}-tasks`, title: "Задачи исследования", content: "" },
    ];
    return { ...source, title: source.title ?? fallback.title, blocks };
  };
  const oldThesis = raw.thesis && typeof raw.thesis === "object" ? raw.thesis : seed.thesis;
  const coursework = normalizeWork(raw.coursework, seed.coursework, "coursework");
  const thesis = normalizeWork(oldThesis, seed.thesis, "thesis");
  const diplomaGrades: DiplomaGrade[] = (Array.isArray(raw.diplomaGrades) ? raw.diplomaGrades : []).map((item) => ({
    id: item.id,
    year: (Number(item.year) === 2 ? 2 : 1) as 1 | 2,
    module: Math.max(1, Math.min(4, Number(item.module) || 1)) as 1 | 2 | 3 | 4,
    subject: item.subject ?? "",
    grade: item.grade ?? "",
  }));

  return sortPlannerCollections({
    profile: { ...seed.profile, ...(raw.profile ?? {}), year: Math.max(1, Math.min(2, Number(raw.profile?.year) || 1)) }, subjects,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : seed.tasks,
    grades: (Array.isArray(raw.grades) ? raw.grades : seed.grades).map((part) => {
      const calculation = part.calculation ?? "single";
      return { ...part, calculation, score: calculation === "single" ? Math.max(0, Math.min(10, part.score ?? 0)) : null, scoreFormat: calculation === "single" ? "numeric" : "none", scoreText: "", minScore: 0, maxScore: 10 };
    }),
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
    coursework,
    thesis,
    diplomaGrades,
    activities: Array.isArray(raw.activities) ? raw.activities : seed.activities,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : seed.sessions,
  });
}
