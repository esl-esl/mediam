import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { materials, plannerStates } from "@/db/schema";
import { createSeedState } from "@/lib/planner-seed";
import { normalizePlannerState } from "@/lib/planner-migrations";
import { sortPlannerCollections } from "@/lib/planner-utils";
import type { Material, PlannerState } from "@/lib/planner-types";
import { getDisplayName, getUserId } from "@/lib/server-user";
import { removeStorageObjects } from "@/lib/supabase-storage";

function databaseError(error: unknown) {
  console.error("Planner database error", error);
  return Response.json(
    { error: "Облачное хранилище временно недоступно. Изменения сохранены на экране — попробуйте ещё раз." },
    { status: 503 },
  );
}

function parseIds(value: string | null, fallback: string | null) {
  if (!value) return fallback ? [fallback] : [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return fallback ? [fallback] : []; }
}

function isPlannerState(value: unknown): value is PlannerState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PlannerState>;
  return Boolean(
    state.profile &&
      Array.isArray(state.subjects) &&
      Array.isArray(state.tasks) &&
      Array.isArray(state.grades) &&
      Array.isArray(state.topics) &&
      Array.isArray(state.lessons) &&
      Array.isArray(state.notes) &&
      Array.isArray(state.schedule) &&
      Array.isArray(state.materials) &&
      state.thesis &&
      Array.isArray(state.activities) &&
      Array.isArray(state.sessions),
  );
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  const db = getDb();
  try {
    let [row] = await db
      .select()
      .from(plannerStates)
      .where(eq(plannerStates.userId, userId))
      .limit(1);

    if (!row) {
      const seeded = createSeedState();
      const displayName = getDisplayName(request);
      if (displayName) seeded.profile.name = displayName.split(/\s+/)[0] || seeded.profile.name;
      [row] = await db
        .insert(plannerStates)
        .values({ userId, payload: JSON.stringify(seeded), revision: 1 })
        .returning();
    }

    const state = normalizePlannerState(JSON.parse(row.payload));
    const uploaded = await db
      .select()
      .from(materials)
      .where(eq(materials.userId, userId))
      .orderBy(asc(materials.createdAt));

    const uploadMaterials: Material[] = uploaded.map((item) => ({
      id: item.id,
      subjectId: item.subjectId,
      lessonId: item.lessonId,
      topicId: item.topicId,
      lessonIds: parseIds(item.lessonIds, item.lessonId),
      topicIds: parseIds(item.topicIds, item.topicId),
      scope: item.scope as Material["scope"],
      name: item.name,
      label: item.label,
      kind: item.kind as Material["kind"],
      storage: "upload",
      mimeType: item.mimeType,
      size: item.size,
      url: `/api/files?id=${encodeURIComponent(item.id)}`,
      createdAt: item.createdAt,
    }));
    state.materials = [
      ...state.materials.filter((item) => item.storage !== "upload"),
      ...uploadMaterials,
    ];
    sortPlannerCollections(state);

    return Response.json({ state, revision: row.revision, updatedAt: row.updatedAt });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(request: Request) {
  const userId = getUserId(request);
  const raw = await request.text();
  if (raw.length > 2_000_000) {
    return Response.json({ error: "Объём данных планера превышает допустимый размер." }, { status: 413 });
  }

  try {
    const body = JSON.parse(raw) as { state?: unknown };
    if (!isPlannerState(body.state)) {
      return Response.json({ error: "Некорректный формат данных." }, { status: 400 });
    }

    const normalized = normalizePlannerState(body.state);
    const state: PlannerState = {
      ...normalized,
      materials: normalized.materials.filter((item) => item.storage !== "upload"),
    };
    const db = getDb();
    const [current] = await db
      .select({ revision: plannerStates.revision })
      .from(plannerStates)
      .where(eq(plannerStates.userId, userId))
      .limit(1);
    const revision = (current?.revision ?? 0) + 1;
    const now = new Date().toISOString();

    await db
      .insert(plannerStates)
      .values({ userId, payload: JSON.stringify(state), revision, updatedAt: now })
      .onConflictDoUpdate({
        target: plannerStates.userId,
        set: { payload: JSON.stringify(state), revision, updatedAt: now },
      });
    return Response.json({ ok: true, revision, updatedAt: now });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Некорректный JSON." }, { status: 400 });
    }
    return databaseError(error);
  }
}

export async function DELETE(request: Request) {
  const userId = getUserId(request);
  try {
    const db = getDb();
    const uploaded = await db.select({ r2Key: materials.r2Key }).from(materials).where(eq(materials.userId, userId));
    if (uploaded.length) await removeStorageObjects(uploaded.map((item) => item.r2Key));
    await db.delete(materials).where(eq(materials.userId, userId));
    await db.delete(plannerStates).where(eq(plannerStates.userId, userId));
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
