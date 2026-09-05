"use client";

import * as React from "react";
import { toast } from "sonner";
import { createSeedState } from "@/lib/planner-seed";
import { normalizePlannerState } from "@/lib/planner-migrations";
import { ensurePlannerState } from "@/lib/planner-safe-state";
import { sortPlannerCollections } from "@/lib/planner-utils";
import type { Material, PlannerState } from "@/lib/planner-types";

type SyncStatus = "loading" | "saved" | "saving" | "offline" | "error";

interface PlannerContextValue {
  state: PlannerState;
  syncStatus: SyncStatus;
  updatedAt: string | null;
  mutate: (recipe: (draft: PlannerState) => void) => void;
  refresh: () => Promise<void>;
  uploadMaterial: (
    file: File,
    subjectId: string | null,
    label: string,
    options?: {
      lessonId?: string | null;
      topicId?: string | null;
      lessonIds?: string[];
      topicIds?: string[];
      scope?: Material["scope"];
      kind?: Material["kind"];
    }
  ) => Promise<Material | null>;
  removeMaterial: (material: Material) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  resetData: () => Promise<void>;
}

const PlannerContext = React.createContext<PlannerContextValue | null>(null);

function normalizeState(value: unknown): PlannerState {
  return sortPlannerCollections(
    ensurePlannerState(
      normalizePlannerState(value)
    )
  );
}

function createInitialState(): PlannerState {
  return sortPlannerCollections(
    ensurePlannerState(createSeedState())
  );
}

function PlannerBootScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700 }}>HSE Study Space</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.55 }}>
          Загружаю учебное пространство…
        </div>
      </div>
    </div>
  );
}

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PlannerState>(createInitialState);
  const [ready, setReady] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("loading");
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  const hydrated = React.useRef(false);
  const dirty = React.useRef(false);
  const saving = React.useRef(false);
  const queued = React.useRef(false);

  const refresh = React.useCallback(async () => {
    setSyncStatus("loading");

    try {
      const response = await fetch("/api/planner", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Planner API unavailable (${response.status})`);
      }

      const payload = (await response.json()) as {
        state?: unknown;
        updatedAt?: string;
      };

      const nextState = normalizeState(payload.state);

      setState(nextState);
      setUpdatedAt(payload.updatedAt ?? null);
      dirty.current = false;
      setSyncStatus("saved");
    } catch (error) {
      console.error("Planner refresh failed", error);

      // Даже если API временно недоступен, приложение получает
      // полностью безопасное локальное состояние.
      setState((current) => normalizeState(current));
      setSyncStatus("offline");
    } finally {
      hydrated.current = true;
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const profile = state.profile ?? createSeedState().profile;
      const dark =
        profile.theme === "dark" ||
        (profile.theme === "system" && media.matches);

      root.classList.toggle("dark", dark);
      root.dataset.theme = dark ? "dark" : "light";
    };

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => media.removeEventListener("change", applyTheme);
  }, [state.profile]);

  const save = React.useCallback(async (nextState: PlannerState) => {
    if (saving.current) {
      queued.current = true;
      return;
    }

    saving.current = true;
    dirty.current = false;
    setSyncStatus("saving");

    try {
      const safeState = normalizeState(nextState);

      const response = await fetch("/api/planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: safeState }),
      });

      if (!response.ok) {
        throw new Error(`Save failed (${response.status})`);
      }

      const payload = (await response.json()) as { updatedAt?: string };

      setUpdatedAt(payload.updatedAt ?? new Date().toISOString());
      setSyncStatus("saved");
    } catch (error) {
      console.error("Planner save failed", error);
      dirty.current = true;
      setSyncStatus("error");

      toast.error("Не удалось сохранить изменения", {
        description:
          "Проверьте соединение — данные остаются открытыми на экране.",
      });
    } finally {
      saving.current = false;

      if (queued.current) {
        queued.current = false;
        dirty.current = true;
        setState((current) => normalizeState(current));
      }
    }
  }, []);

  React.useEffect(() => {
    if (!ready || !hydrated.current || !dirty.current) return;

    const timer = window.setTimeout(() => {
      void save(state);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [ready, save, state]);

  const mutate = React.useCallback(
    (recipe: (draft: PlannerState) => void) => {
      dirty.current = true;

      setState((current) => {
        const next = structuredClone(normalizeState(current));
        recipe(next);
        return normalizeState(next);
      });
    },
    []
  );

  const uploadMaterial = React.useCallback(
    async (
      file: File,
      subjectId: string | null,
      label: string,
      options?: {
        lessonId?: string | null;
        topicId?: string | null;
        lessonIds?: string[];
        topicIds?: string[];
        scope?: Material["scope"];
        kind?: Material["kind"];
      }
    ) => {
      const form = new FormData();

      form.append("file", file);

      if (subjectId) form.append("subjectId", subjectId);
      if (options?.lessonId) form.append("lessonId", options.lessonId);
      if (options?.topicId) form.append("topicId", options.topicId);

      options?.lessonIds?.forEach((id) => form.append("lessonIds", id));
      options?.topicIds?.forEach((id) => form.append("topicIds", id));

      if (options?.scope) form.append("scope", options.scope);
      if (options?.kind) form.append("kind", options.kind);

      form.append("label", label);

      const loading = toast.loading("Загружаю материал…");

      try {
        const response = await fetch("/api/files", {
          method: "POST",
          body: form,
        });

        const contentType = response.headers.get("content-type") ?? "";

        const payload = contentType.includes("application/json")
          ? ((await response.json()) as {
              material?: Material;
              error?: string;
            })
          : {
              error:
                (await response.text()) ||
                `Ошибка загрузки (${response.status})`,
            };

        if (!response.ok || !payload.material) {
          throw new Error(payload.error || "Не удалось загрузить файл.");
        }

        setState((current) =>
          normalizeState({
            ...current,
            materials: [
              ...(Array.isArray(current.materials)
                ? current.materials
                : []),
              payload.material!,
            ],
          })
        );

        toast.success("Материал загружен", { id: loading });
        return payload.material;
      } catch (error) {
        console.error("Material upload failed", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить материал",
          { id: loading }
        );

        return null;
      }
    },
    []
  );

  const removeMaterial = React.useCallback(
    async (material: Material) => {
      if (material.storage === "upload") {
        const response = await fetch(
          `/api/files?id=${encodeURIComponent(material.id)}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          toast.error("Не удалось удалить файл");
          return;
        }

        setState((current) =>
          normalizeState({
            ...current,
            materials: (current.materials ?? []).filter(
              (item) => item.id !== material.id
            ),
          })
        );
      } else {
        mutate((draft) => {
          draft.materials = (draft.materials ?? []).filter(
            (item) => item.id !== material.id
          );
        });
      }

      toast.success("Материал удалён");
    },
    [mutate]
  );

  const removeSubject = React.useCallback(
    async (subjectId: string) => {
      const safeState = normalizeState(state);

      const uploads = safeState.materials.filter(
        (item) =>
          item.subjectId === subjectId &&
          item.storage === "upload"
      );

      await Promise.all(
        uploads.map((item) =>
          fetch(`/api/files?id=${encodeURIComponent(item.id)}`, {
            method: "DELETE",
          })
        )
      );

      mutate((draft) => {
        draft.subjects = draft.subjects.filter(
          (item) => item.id !== subjectId
        );
        draft.tasks = draft.tasks.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.grades = draft.grades.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.topics = draft.topics.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.lessons = draft.lessons.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.notes = draft.notes.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.schedule = draft.schedule.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.materials = draft.materials.filter(
          (item) => item.subjectId !== subjectId
        );
        draft.sessions = draft.sessions.filter(
          (item) => item.subjectId !== subjectId
        );
      });

      toast.success("Дисциплина удалена");
    },
    [mutate, state]
  );

  const exportData = React.useCallback(() => {
    const safeState = normalizeState(state);

    const blob = new Blob(
      [JSON.stringify(safeState, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `hse-study-planner-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    anchor.click();
    URL.revokeObjectURL(url);

    toast.success("Резервная копия готова");
  }, [state]);

  const importData = React.useCallback(async (file: File) => {
    try {
      const parsed = normalizeState(
        JSON.parse(await file.text())
      );

      dirty.current = true;
      setState(parsed);

      toast.success("Данные импортированы");
    } catch (error) {
      console.error("Planner import failed", error);
      toast.error(
        "Этот файл не похож на резервную копию планера"
      );
    }
  }, []);

  const resetData = React.useCallback(async () => {
    const response = await fetch("/api/planner", {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Не удалось сбросить данные");
      return;
    }

    await refresh();
    toast.success("Создано новое учебное пространство");
  }, [refresh]);

  const value = React.useMemo<PlannerContextValue>(
    () => ({
      state: normalizeState(state),
      syncStatus,
      updatedAt,
      mutate,
      refresh,
      uploadMaterial,
      removeMaterial,
      removeSubject,
      exportData,
      importData,
      resetData,
    }),
    [
      state,
      syncStatus,
      updatedAt,
      mutate,
      refresh,
      uploadMaterial,
      removeMaterial,
      removeSubject,
      exportData,
      importData,
      resetData,
    ]
  );

  // Ключевой момент:
  // при SSR Worker НЕ рендерит Workspace и вкладки,
  // поэтому page-specific .filter/.map не могут уронить Worker.
  if (!ready) {
    return <PlannerBootScreen />;
  }

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const context = React.useContext(PlannerContext);

  if (!context) {
    throw new Error(
      "usePlanner must be used inside PlannerProvider"
    );
  }

  return context;
}
