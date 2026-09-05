import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("orders lessons by date and leaves undated lessons last", async () => {
  const { compareLessonsChronologically } = await vite.ssrLoadModule("/lib/planner-utils.ts");
  const lessons = [
    { id: "undated", number: 1 },
    { id: "late", number: 2, date: "2026-10-02T10:00:00.000Z" },
    { id: "early", number: 9, date: "2026-09-01T10:00:00.000Z" },
  ];
  lessons.sort(compareLessonsChronologically);
  assert.deepEqual(lessons.map((lesson) => lesson.id), ["early", "late", "undated"]);
});

test("uses zero for missing formula marks and normalizes lesson scales", async () => {
  const { gradeForSubject } = await vite.ssrLoadModule("/lib/planner-utils.ts");
  const grades = [
    { id: "direct", subjectId: "course", title: "Экзамен", calculation: "single", scoreFormat: "numeric", score: null, minScore: 0, maxScore: 10, weight: .5 },
    { id: "lessons", subjectId: "course", title: "Семинары", calculation: "lesson_average", lessonKind: "seminar", scoreFormat: "none", score: null, minScore: 0, maxScore: 10, weight: .5 },
  ];
  const lessons = [{ id: "lesson", subjectId: "course", kind: "seminar", assessmentFormat: "numeric", assessmentValue: "1", assessmentMin: 0, assessmentMax: 2 }];
  const result = gradeForSubject("course", grades, lessons);
  assert.equal(result.average, 2.5);
});
