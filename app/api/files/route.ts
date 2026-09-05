import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { materials } from "@/db/schema";
import { getUserId } from "@/lib/server-user";
import {
  deleteStoredFiles,
  downloadStoredFile,
  uploadStoredFile,
} from "@/lib/supabase-storage";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function cleanFilename(value: string) {
  return value.replace(/[\r\n/\\]/g, "-").slice(0, 180) || "material";
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      return Response.json({ error: "Выберите файл." }, { status: 400 });
    }
    if (candidate.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Максимальный размер файла — 20 МБ." }, { status: 413 });
    }

    const id = crypto.randomUUID();
    const subjectId = String(form.get("subjectId") || "") || null;
    const lessonId = String(form.get("lessonId") || "") || null;
    const topicId = String(form.get("topicId") || "") || null;
    const lessonIds = form.getAll("lessonIds").map(String).filter(Boolean);
    const topicIds = form.getAll("topicIds").map(String).filter(Boolean);
    const tags = [...new Set(form.getAll("tags").map(String).map((tag) => tag.trim()).filter(Boolean))].slice(0, 30);
    const normalizedLessonIds = [...new Set([...lessonIds, ...(lessonId ? [lessonId] : [])])];
    const normalizedTopicIds = [...new Set([...topicIds, ...(topicId ? [topicId] : [])])];
    const requestedScope = String(form.get("scope") || (topicId ? "topic" : lessonId ? "lesson" : subjectId ? "subject" : "general"));
    const scope = ["general", "subject", "topic", "lesson", "coursework", "thesis"].includes(requestedScope) ? requestedScope : "subject";
    const requestedKind = String(form.get("kind") || "file");
    const kind = ["file", "presentation", "gradebook", "recording", "textbook"].includes(requestedKind) ? requestedKind : "file";
    const label = String(form.get("label") || "Материал").slice(0, 80);
    const name = cleanFilename(candidate.name);
    const mimeType = candidate.type || "application/octet-stream";
    const storageKey = `${encodeURIComponent(userId)}/${id}/${name}`;

    await uploadStoredFile(storageKey, candidate, mimeType);

    const db = getDb();
    let row: typeof materials.$inferSelect;
    try {
      [row] = await db
        .insert(materials)
        .values({ id, userId, subjectId, lessonId, topicId, lessonIds: JSON.stringify(normalizedLessonIds), topicIds: JSON.stringify(normalizedTopicIds), scope, name, label, kind, mimeType, size: candidate.size, r2Key: storageKey })
        .returning();
    } catch (databaseError) {
      await deleteStoredFiles([storageKey]).catch((cleanupError) => {
        console.error("Supabase upload rollback error", cleanupError);
      });
      throw databaseError;
    }

    return Response.json({
      material: {
        id: row.id,
        subjectId: row.subjectId,
        lessonId: row.lessonId,
        topicId: row.topicId,
        lessonIds: normalizedLessonIds,
        topicIds: normalizedTopicIds,
        tags,
        scope: row.scope,
        name: row.name,
        label: row.label,
        kind: row.kind,
        storage: "upload",
        mimeType: row.mimeType,
        size: row.size,
        url: `/api/files?id=${encodeURIComponent(row.id)}`,
        createdAt: row.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("File upload error", error);
    return Response.json({ error: "Не удалось загрузить файл. Попробуйте ещё раз." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const userId = getUserId(request);
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) return Response.json({ error: "Не указан материал." }, { status: 400 });
    const subjectId = body.subjectId ? String(body.subjectId) : null;
    const lessonIds = Array.isArray(body.lessonIds) ? [...new Set(body.lessonIds.map(String).filter(Boolean))] : [];
    const topicIds = Array.isArray(body.topicIds) ? [...new Set(body.topicIds.map(String).filter(Boolean))] : [];
    const lessonId = lessonIds[0] ?? null;
    const topicId = topicIds[0] ?? null;
    const requestedScope = String(body.scope ?? (topicId ? "topic" : lessonId ? "lesson" : subjectId ? "subject" : "general"));
    const scope = ["general", "subject", "topic", "lesson", "coursework", "thesis"].includes(requestedScope) ? requestedScope : "general";
    const requestedKind = String(body.kind ?? "file");
    const kind = ["file", "presentation", "gradebook", "recording", "textbook"].includes(requestedKind) ? requestedKind : "file";
    const tags = Array.isArray(body.tags) ? [...new Set(body.tags.map(String).map((tag) => tag.trim()).filter(Boolean))].slice(0, 30) : [];
    const label = String(body.label ?? "Материал").trim().slice(0, 80) || "Материал";
    const db = getDb();
    const [row] = await db.update(materials).set({
      subjectId,
      lessonId,
      topicId,
      lessonIds: JSON.stringify(lessonIds),
      topicIds: JSON.stringify(topicIds),
      scope,
      label,
      kind,
    }).where(and(eq(materials.id, id), eq(materials.userId, userId))).returning();
    if (!row) return Response.json({ error: "Материал не найден." }, { status: 404 });
    return Response.json({ material: {
      id: row.id,
      subjectId: row.subjectId,
      lessonId: row.lessonId,
      topicId: row.topicId,
      lessonIds,
      topicIds,
      tags,
      scope: row.scope,
      name: row.name,
      label: row.label,
      kind: row.kind,
      storage: "upload",
      mimeType: row.mimeType,
      size: row.size,
      url: `/api/files?id=${encodeURIComponent(row.id)}`,
      createdAt: row.createdAt,
    } });
  } catch (error) {
    console.error("File update error", error);
    return Response.json({ error: "Не удалось обновить материал." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Не указан файл." }, { status: 400 });
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .limit(1);
    if (!row) return Response.json({ error: "Файл не найден." }, { status: 404 });
    const object = await downloadStoredFile(row.r2Key);
    if (!object) return Response.json({ error: "Файл не найден в хранилище." }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(row.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("File read error", error);
    return Response.json({ error: "Не удалось открыть файл." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const userId = getUserId(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Не указан файл." }, { status: 400 });
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .limit(1);
    if (!row) return Response.json({ error: "Файл не найден." }, { status: 404 });
    await deleteStoredFiles([row.r2Key]);
    await db.delete(materials).where(and(eq(materials.id, id), eq(materials.userId, userId)));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("File delete error", error);
    return Response.json({ error: "Не удалось удалить файл." }, { status: 503 });
  }
}
