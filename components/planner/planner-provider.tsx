"use client";

import * as React from "react";
import { toast } from "sonner";
import { createSeedState } from "@/lib/planner-seed";
import { normalizePlannerState } from "@/lib/planner-migrations";
import { sortPlannerCollections } from "@/lib/planner-utils";
import type { Material, PlannerState } from "@/lib/planner-types";

type SyncStatus = "loading" | "saved" | "saving" | "offline" | "error";

interface PlannerContextValue {
  state: PlannerState;
  syncStatus: SyncStatus;
  updatedAt: string | null;
  mutate: (recipe: (draft: PlannerState) => void) => void;
  refresh: () => Promise<void>;
  uploadMaterial: (file: File, subjectId: string | null, label: string, options?: { lessonId?: string | null; topicId?: string | null; lessonIds?: string[]; topicIds?: string[]; scope?: Material["scope"]; kind?: Material["kind"]; tags?: string[] }) => Promise<Material | null>;
  updateMaterial: (material: Material) => Promise<Material | null>;
  removeMaterial: (material: Material) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  resetData: () => Promise<void>;
}

const PlannerContext = React.createContext<PlannerContextValue | null>(null);
const THEME_STORAGE_KEY = "study-space-theme";
const INITIAL_RENDER_DATE = new Date("2026-01-15T12:00:00.000Z");

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PlannerState>(() => createSeedState(INITIAL_RENDER_DATE));
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("loading");
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const hydrated = React.useRef(false);
  const dirty = React.useRef(false);
  const saving = React.useRef(false);
  const queued = React.useRef(false);

  const refresh = React.useCallback(async () => {
    setSyncStatus("loading");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/planner", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Planner API unavailable");
      const payload = (await response.json()) as { state: PlannerState; updatedAt?: string };
      setState(normalizePlannerState(payload.state));
      setUpdatedAt(payload.updatedAt ?? null);
      dirty.current = false;
      setSyncStatus("saved");
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
    } finally {
      window.clearTimeout(timeout);
      hydrated.current = true;
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial remote hydration belongs to the mount lifecycle.
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      let stored: string | null = null;
      try { stored = window.localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Private mode can block storage. */ }
      const mode = syncStatus === "loading" && (stored === "light" || stored === "dark" || stored === "system") ? stored : state.profile.theme;
      const dark = mode === "dark" || (mode === "system" && media.matches);
      root.classList.toggle("dark", dark);
      root.dataset.theme = dark ? "dark" : "light";
      root.style.colorScheme = dark ? "dark" : "light";
      if (syncStatus !== "loading") { try { window.localStorage.setItem(THEME_STORAGE_KEY, state.profile.theme); } catch { /* Theme still works for this session. */ } }
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [state.profile.theme, syncStatus]);

  const save = React.useCallback(async (nextState: PlannerState) => {
    if (saving.current) {
      queued.current = true;
      return;
    }
    saving.current = true;
    dirty.current = false;
    setSyncStatus("saving");
    try {
      const response = await fetch("/api/planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      if (!response.ok) throw new Error("Save failed");
      const payload = (await response.json()) as { updatedAt?: string };
      setUpdatedAt(payload.updatedAt ?? new Date().toISOString());
      setSyncStatus("saved");
    } catch (error) {
      console.error(error);
      dirty.current = true;
      setSyncStatus("error");
      toast.error("Не удалось сохранить изменения", { description: "Проверьте соединение — данные остаются открытыми на экране." });
    } finally {
      saving.current = false;
      if (queued.current) {
        queued.current = false;
        dirty.current = true;
        setState((current) => ({ ...current }));
      }
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated.current || !dirty.current) return;
    const timer = window.setTimeout(() => void save(state), 700);
    return () => window.clearTimeout(timer);
  }, [save, state]);

  const mutate = React.useCallback((recipe: (draft: PlannerState) => void) => {
    dirty.current = true;
    setState((current) => {
      const next = typeof globalThis.structuredClone === "function" ? globalThis.structuredClone(current) : JSON.parse(JSON.stringify(current)) as PlannerState;
      recipe(next);
      return sortPlannerCollections(next);
    });
  }, []);

  const uploadMaterial = React.useCallback(async (file: File, subjectId: string | null, label: string, options?: { lessonId?: string | null; topicId?: string | null; lessonIds?: string[]; topicIds?: string[]; scope?: Material["scope"]; kind?: Material["kind"]; tags?: string[] }) => {
    const form = new FormData();
    form.append("file", file);
    if (subjectId) form.append("subjectId", subjectId);
    if (options?.lessonId) form.append("lessonId", options.lessonId);
    if (options?.topicId) form.append("topicId", options.topicId);
    options?.lessonIds?.forEach((id) => form.append("lessonIds", id));
    options?.topicIds?.forEach((id) => form.append("topicIds", id));
    if (options?.scope) form.append("scope", options.scope);
    if (options?.kind) form.append("kind", options.kind);
    options?.tags?.forEach((tag) => form.append("tags", tag));
    form.append("label", label);
    const loading = toast.loading("Загружаю материал…");
    try {
      const response = await fetch("/api/files", { method: "POST", body: form });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? (await response.json()) as { material?: Material; error?: string }
        : { error: (await response.text()) || `Ошибка загрузки (${response.status})` };
      if (!response.ok || !payload.material) throw new Error(payload.error || "Upload failed");
      dirty.current = true;
      setState((current) => sortPlannerCollections({ ...current, materials: [...current.materials, payload.material!] }));
      toast.success("Материал загружен", { id: loading });
      return payload.material;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить материал", { id: loading });
      return null;
    }
  }, []);

  const updateMaterial = React.useCallback(async (material: Material) => {
    if (material.storage !== "upload") {
      mutate((draft) => {
        const index = draft.materials.findIndex((item) => item.id === material.id);
        if (index >= 0) draft.materials[index] = material;
      });
      return material;
    }
    try {
      const response = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: material.id,
          subjectId: material.subjectId,
          lessonIds: material.lessonIds ?? [],
          topicIds: material.topicIds ?? [],
          scope: material.scope,
          label: material.label,
          kind: material.kind,
          tags: material.tags ?? [],
        }),
      });
      const payload = (await response.json()) as { material?: Material; error?: string };
      if (!response.ok || !payload.material) throw new Error(payload.error || "Не удалось обновить материал.");
      mutate((draft) => {
        draft.materials = draft.materials.map((item) => item.id === material.id ? payload.material! : item);
      });
      return payload.material;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить материал");
      return null;
    }
  }, [mutate]);

  const removeMaterial = React.useCallback(async (material: Material) => {
    if (material.storage === "upload") {
      const response = await fetch(`/api/files?id=${encodeURIComponent(material.id)}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error("Не удалось удалить файл");
        return;
      }
    }
    mutate((draft) => {
      draft.materials = draft.materials.filter((item) => item.id !== material.id);
    });
    toast.success("Материал удалён");
  }, [mutate]);

  const removeSubject = React.useCallback(async (subjectId: string) => {
    const uploads = state.materials.filter((item) => item.subjectId === subjectId && item.storage === "upload");
    await Promise.all(uploads.map((item) => fetch(`/api/files?id=${encodeURIComponent(item.id)}`, { method: "DELETE" })));
    mutate((draft) => {
      draft.subjects = draft.subjects.filter((item) => item.id !== subjectId);
      draft.tasks = draft.tasks.filter((item) => item.subjectId !== subjectId);
      draft.grades = draft.grades.filter((item) => item.subjectId !== subjectId);
      draft.topics = draft.topics.filter((item) => item.subjectId !== subjectId);
      draft.lessons = draft.lessons.filter((item) => item.subjectId !== subjectId);
      draft.notes = draft.notes.filter((item) => item.subjectId !== subjectId);
      draft.schedule = draft.schedule.filter((item) => item.subjectId !== subjectId);
      draft.materials = draft.materials.filter((item) => item.subjectId !== subjectId);
      draft.sessions = draft.sessions.filter((item) => item.subjectId !== subjectId);
    });
    toast.success("Дисциплина удалена");
  }, [mutate, state.materials]);

  const exportData = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hse-study-planner-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Резервная копия готова");
  }, [state]);

  const importData = React.useCallback(async (file: File) => {
    try {
      const parsed = normalizePlannerState(JSON.parse(await file.text()));
      dirty.current = true;
      setState(parsed);
      toast.success("Данные импортированы");
    } catch {
      toast.error("Этот файл не похож на резервную копию планера");
    }
  }, []);

  const resetData = React.useCallback(async () => {
    const response = await fetch("/api/planner", { method: "DELETE" });
    if (!response.ok) {
      toast.error("Не удалось сбросить данные");
      return;
    }
    await refresh();
    toast.success("Создано новое учебное пространство");
  }, [refresh]);

  const value = React.useMemo<PlannerContextValue>(() => ({
    state,
    syncStatus,
    updatedAt,
    mutate,
    refresh,
    uploadMaterial,
    updateMaterial,
    removeMaterial,
    removeSubject,
    exportData,
    importData,
    resetData,
  }), [exportData, importData, mutate, refresh, removeMaterial, removeSubject, resetData, state, syncStatus, updatedAt, updateMaterial, uploadMaterial]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = React.useContext(PlannerContext);
  if (!context) throw new Error("usePlanner must be used inside PlannerProvider");
  return context;
}
