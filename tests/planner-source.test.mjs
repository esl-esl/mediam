import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("declares HSE Study Space metadata and Russian locale", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /HSE Study Space/);
  assert.match(layout, /lang="ru"/);
  assert.match(layout, /codex-preview/);
});

test("ships dynamic subjects and course material workflows", async () => {
  const dialogs = await read("components/planner/editor-dialogs.tsx");
  const provider = await read("components/planner/planner-provider.tsx");
  assert.match(dialogs, /Дисциплина добавлена/);
  assert.match(dialogs, /По выбору/);
  assert.match(dialogs, /Запись лекции/);
  assert.match(provider, /removeSubject/);
  assert.match(provider, /uploadMaterial/);
});

test("uses D1 state and private Supabase file persistence", async () => {
  const plannerRoute = await read("app/api/planner/route.ts");
  const fileRoute = await read("app/api/files/route.ts");
  const storage = await read("lib/supabase-storage.ts");
  assert.match(plannerRoute, /plannerStates/);
  assert.match(fileRoute, /uploadStorageObject/);
  assert.match(fileRoute, /downloadStorageObject/);
  assert.match(fileRoute, /removeStorageObjects/);
  assert.match(storage, /SUPABASE_SECRET_KEY/);
  assert.match(storage, /storage\.from\(bucketName\)/);
});

test("ships the streamlined subject workspace and automatic HSE calendar", async () => {
  const subject = await read("components/planner/views-subject.tsx");
  const dashboard = await read("components/planner/views-dashboard.tsx");
  const calendar = await read("lib/academic-calendar.ts");

  assert.doesNotMatch(subject, /TabsTrigger|TabsContent/);
  assert.match(subject, /LessonAssessments/);
  assert.match(subject, /LessonCard/);
  assert.match(subject, /Следующее/);
  assert.match(subject, /Занятия/);
  assert.match(subject, /Темы курса/);
  assert.match(subject, /Ведомость/);
  assert.match(dashboard, /ModuleNavigator/);
  assert.match(dashboard, /https:\/\/istudy\.hse\.ru/);
  assert.match(dashboard, /https:\/\/smartpro\.hse\.ru/);
  assert.match(calendar, /2026-10-26/);
  assert.match(calendar, /2027\/2028/);
});

test("supports many-to-many course topics, flexible assessment formats, and multi-module courses", async () => {
  const types = await read("lib/planner-types.ts");
  const dialogs = await read("components/planner/editor-dialogs.tsx");
  const subject = await read("components/planner/views-subject.tsx");
  assert.match(types, /interface CourseTopic/);
  assert.match(types, /topicIds: string\[\]/);
  assert.match(types, /modules\?: number\[\]/);
  for (const kind of ["lecture", "seminar", "nis", "control", "exam", "workshop"]) assert.match(types, new RegExp(kind));
  assert.match(types, /plusminus/);
  assert.match(types, /numberEnd\?: number/);
  assert.match(dialogs, /Связанные занятия/);
  assert.match(subject, /Формат отметки/);
  assert.match(subject, /assessmentMin/);
  assert.match(subject, /assessmentMax/);
});

test("sorts dated records globally and supports two-course navigation", async () => {
  const provider = await read("components/planner/planner-provider.tsx");
  const utils = await read("lib/planner-utils.ts");
  const app = await read("components/planner/planner-app.tsx");
  const dashboard = await read("components/planner/views-dashboard.tsx");
  assert.match(provider, /sortPlannerCollections/);
  assert.match(utils, /compareLessonsChronologically/);
  assert.match(utils, /compareTasksChronologically/);
  assert.match(app, /Модули и курсы/);
  assert.match(dashboard, /1 курс/);
  assert.match(dashboard, /2 курс/);
});

test("ships separate coursework, thesis, diploma grades, and mixed calendar events", async () => {
  const types = await read("lib/planner-types.ts");
  const growth = await read("components/planner/views-growth.tsx");
  const calendar = await read("components/planner/views-tasks-calendar.tsx");
  assert.match(types, /coursework: ThesisState/);
  assert.match(types, /diplomaGrades: DiplomaGrade\[\]/);
  assert.match(growth, /Курсовая · 1 курс/);
  assert.match(growth, /КР и ВКР/);
  assert.match(growth, /export function DiplomaView/);
  assert.match(calendar, /calendar-event-lesson/);
  assert.match(calendar, /calendar-event-deadline/);
});

test("removes focus UI and keeps thesis block names editable", async () => {
  const app = await read("components/planner/planner-app.tsx");
  const views = await read("components/planner/views.tsx");
  const growth = await read("components/planner/views-growth.tsx");
  assert.doesNotMatch(app, /\/focus|Фокус/);
  assert.doesNotMatch(views, /FocusView|case \"focus\"/);
  assert.doesNotMatch(growth, /FocusView|Фокус-сессия/);
  assert.match(growth, /Название части/);
  assert.match(growth, /item\.title = event\.target\.value/);
});

test("persists multi-linked uploaded materials", async () => {
  const fileRoute = await read("app/api/files/route.ts");
  const schema = await read("db/schema.ts");
  assert.match(fileRoute, /form\.getAll\("lessonIds"\)/);
  assert.match(fileRoute, /form\.getAll\("topicIds"\)/);
  assert.match(schema, /lessonIds: text\("lesson_ids"\)/);
  assert.match(schema, /topicIds: text\("topic_ids"\)/);
});
