import { createSeedState } from "./planner-seed";
import type {
  AssessmentFormat,
  CourseTopic,
  PlannerState,
  SubjectIconKey,
  ThesisState,
} from "./planner-types";
import { inferSubjectIcon, subjectIconKeys } from "./subject-icons";

const validIcons = new Set<SubjectIconKey>(subjectIconKeys);
const validAssessmentFormats = new Set<AssessmentFormat>([
  "none",
  "numeric",
  "plusminus",
  "text",
]);

const validMaterialScopes = new Set([
  "general",
  "subject",
  "topic",
  "lesson",
  "coursework",
  "thesis",
]);

function uniqueModules(modules: unknown, fallback: number) {
  const source = Array.isArray(modules) ? modules : [fallback];
  const result = [
    ...new Set(
      source
        .map(Number)
        .filter((item) => Number.isFinite(item) && item >= 1 && item <= 4)
    ),
  ].sort((a, b) => a - b);

  return result.length
    ? result
    : [Math.max(1, Math.min(4, fallback || 1))];
}

function normalizeFinalGrade(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(10, numeric));
}

function normalizeWork(
  value: unknown,
  seed: ThesisState,
  prefix: "coursework" | "thesis"
): ThesisState {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<ThesisState>)
      : seed;

  const sourceBlocks =
    Array.isArray(raw.blocks) && raw.blocks.length
      ? raw.blocks
      : seed.blocks;

  const legacyQuestion = sourceBlocks.find(
    (block) =>
      String(block.title ?? "")
        .trim()
        .toLocaleLowerCase("ru") === "исследовательский вопрос"
  );

  const blocks = sourceBlocks
    .filter(
      (block) =>
        String(block.title ?? "")
          .trim()
          .toLocaleLowerCase("ru") !== "исследовательский вопрос"
    )
    .map((block, index) => ({
      id: block.id || `${prefix}-block-${index + 1}`,
      title: String(block.title ?? "Новый блок"),
      content: String(block.content ?? ""),
    }));

  return {
    ...seed,
    ...raw,
    title: String(raw.title ?? seed.title),
    supervisor: String(raw.supervisor ?? seed.supervisor ?? ""),
    stage: String(raw.stage ?? seed.stage ?? ""),
    researchQuestion: String(
      raw.researchQuestion ??
        legacyQuestion?.content ??
        seed.researchQuestion ??
        ""
    ),
    blocks,
    chapters: Array.isArray(raw.chapters)
      ? raw.chapters
      : seed.chapters ?? [],
    milestones: Array.isArray(raw.milestones)
      ? raw.milestones
      : seed.milestones ?? [],
    progress:
      typeof raw.progress === "number"
        ? Math.max(0, Math.min(100, raw.progress))
        : seed.progress,
    targetWords:
      typeof raw.targetWords === "number"
        ? raw.targetWords
        : seed.targetWords,
    currentWords:
      typeof raw.currentWords === "number"
        ? raw.currentWords
        : seed.currentWords,
    nextMeeting:
      typeof raw.nextMeeting === "string"
        ? raw.nextMeeting
        : seed.nextMeeting,
  };
}

export function normalizePlannerState(value: unknown): PlannerState {
  const seed = createSeedState();

  if (!value || typeof value !== "object") return seed;

  const raw = value as Partial<PlannerState> & Record<string, unknown>;

  const subjects = (
    Array.isArray(raw.subjects) ? raw.subjects : seed.subjects
  ).map((subject) => {
    const candidate = subject as PlannerState["subjects"][number] & {
      status?: string;
    };

    const status =
      candidate.status === "university"
        ? "magolego"
        : candidate.status;

    const primaryModule = Number(candidate.module) || 1;
    const seedSubject = seed.subjects.find(
      (item) => item.id === candidate.id
    );

    return {
      ...candidate,
      color: candidate.color || seedSubject?.color || "#2563EB",
      module: primaryModule,
      modules: uniqueModules(candidate.modules, primaryModule),
      icon:
        candidate.icon && validIcons.has(candidate.icon)
          ? candidate.icon
          : inferSubjectIcon(
              candidate.title || candidate.shortTitle || ""
            ),
      status:
        status === "elective" || status === "magolego"
          ? status
          : "required",
      objectives: candidate.objectives ?? [],
      scheduleLabel: candidate.scheduleLabel ?? "",
      room: candidate.room ?? "",
      description: candidate.description ?? "",
      roundingRule: candidate.roundingRule ?? "math",
      pinned: candidate.pinned ?? false,
      finalGrade: normalizeFinalGrade(candidate.finalGrade),
    };
  });

  const subjectIds = new Set(subjects.map((subject) => subject.id));

  const rawLessons =
    Array.isArray(raw.lessons) && raw.lessons.length
      ? raw.lessons
      : seed.lessons.filter((lesson) =>
          subjectIds.has(lesson.subjectId)
        );

  const topics: CourseTopic[] = (
    Array.isArray(raw.topics) && raw.topics.length ? raw.topics : []
  ).map((topic) => ({
    ...topic,
    notes: topic.notes ?? "",
  }));

  const topicIds = new Set(topics.map((topic) => topic.id));
  const migratedTopics = new Map<string, string>();

  const lessons = rawLessons.map((lesson, index) => {
    let linked = Array.isArray(lesson.topicIds)
      ? lesson.topicIds.filter((id) => topicIds.has(id))
      : [];

    if (!linked.length && lesson.topic?.trim()) {
      const key = `${lesson.subjectId}:${lesson.topic
        .trim()
        .toLocaleLowerCase("ru")}`;

      let topicId =
        migratedTopics.get(key) ??
        topics.find(
          (topic) =>
            topic.subjectId === lesson.subjectId &&
            topic.title.toLocaleLowerCase("ru") ===
              lesson.topic!.trim().toLocaleLowerCase("ru")
        )?.id;

      if (!topicId) {
        topicId = `topic-${lesson.id}`;
        topics.push({
          id: topicId,
          subjectId: lesson.subjectId,
          title: lesson.topic.trim(),
          notes: "",
        });
        topicIds.add(topicId);
      }

      migratedTopics.set(key, topicId);
      linked = [topicId];
    }

    const legacyGrade = lesson.grade ?? null;
    const assessmentFormat = validAssessmentFormats.has(
      lesson.assessmentFormat
    )
      ? lesson.assessmentFormat
      : "numeric";

    const kind = lesson.kind ?? "seminar";
    const number = lesson.number ?? index + 1;

    return {
      ...lesson,
      number,
      kind,
      title:
        lesson.title ??
        `${
          kind === "lecture"
            ? "Лекция"
            : kind === "nis"
              ? "НИС"
              : kind === "control"
                ? "Контрольная"
                : kind === "exam"
                  ? "Экзамен"
                  : kind === "workshop"
                    ? "Практическое занятие"
                    : "Семинар"
        } ${number}`,
      topicIds: linked,
      assessmentFormat,
      assessmentValue:
        lesson.assessmentValue ??
        (legacyGrade === null ? "" : String(legacyGrade)),
      assessmentMin: lesson.assessmentMin ?? 0,
      assessmentMax: lesson.assessmentMax ?? 10,
      grade: legacyGrade,
      notes: lesson.notes ?? "",
    };
  });

  const coursework = normalizeWork(
    raw.coursework,
    seed.coursework,
    "coursework"
  );
  const thesis = normalizeWork(raw.thesis, seed.thesis, "thesis");

  return {
    profile: { ...seed.profile, ...(raw.profile ?? {}) },
    subjects,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : seed.tasks,
    grades: (
      Array.isArray(raw.grades) ? raw.grades : seed.grades
    ).map((part) => ({
      ...part,
      calculation: part.calculation ?? "single",
      scoreFormat: part.scoreFormat ?? "numeric",
      scoreText: part.scoreText ?? "",
      minScore: part.minScore ?? 0,
    })),
    topics,
    lessons,
    notes: (
      Array.isArray(raw.notes) ? raw.notes : seed.notes
    ).map((note) => ({
      ...note,
      body: note.body ?? "",
      format: note.format === "link" ? "link" : "text",
      url: note.url ?? "",
      lessonIds: Array.isArray(note.lessonIds) ? note.lessonIds : [],
      topicIds: Array.isArray(note.topicIds) ? note.topicIds : [],
    })),
    schedule: Array.isArray(raw.schedule) ? raw.schedule : [],
    materials: (
      Array.isArray(raw.materials) ? raw.materials : seed.materials
    ).map((material) => {
      const fallbackScope = material.subjectId ? "subject" : "general";
      const scope =
        material.scope && validMaterialScopes.has(material.scope)
          ? material.scope
          : fallbackScope;

      return {
        ...material,
        scope,
        lessonId: material.lessonId ?? null,
        topicId: material.topicId ?? null,
        lessonIds: Array.isArray(material.lessonIds)
          ? material.lessonIds
          : material.lessonId
            ? [material.lessonId]
            : [],
        topicIds: Array.isArray(material.topicIds)
          ? material.topicIds
          : material.topicId
            ? [material.topicId]
            : [],
      };
    }),
    coursework,
    thesis,
    activities: Array.isArray(raw.activities) ? raw.activities : seed.activities,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : seed.sessions,
  };
}
