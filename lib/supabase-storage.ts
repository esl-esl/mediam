import { env } from "cloudflare:workers";

type SupabaseWorkerEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
};

function config() {
  const workerEnv = env as unknown as SupabaseWorkerEnv;
  const url = workerEnv.SUPABASE_URL?.trim().replace(/\/$/, "");
  const secretKey = workerEnv.SUPABASE_SECRET_KEY?.trim();
  const bucket = workerEnv.SUPABASE_STORAGE_BUCKET?.trim();

  const missing = [
    !url && "SUPABASE_URL",
    !secretKey && "SUPABASE_SECRET_KEY",
    !bucket && "SUPABASE_STORAGE_BUCKET",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Missing Supabase configuration: ${missing.join(", ")}`);
  }

  return { url: url!, secretKey: secretKey!, bucket: bucket! };
}

function storageUrl(path: string) {
  const { url, bucket } = config();
  return `${url}/storage/v1/object/${encodeURIComponent(bucket)}${path ? `/${path}` : ""}`;
}

function authHeaders(extra?: HeadersInit) {
  const { secretKey } = config();
  const headers = new Headers(extra);
  headers.set("apikey", secretKey);
  // Supabase Storage accepts the backend key through its normal Storage auth flow.
  // For sb_secret_* keys the gateway maps this credential to service_role server-side.
  headers.set("Authorization", `Bearer ${secretKey}`);
  return headers;
}

async function storageError(response: Response) {
  const body = await response.text().catch(() => "");
  return body || `${response.status} ${response.statusText}`;
}

export async function uploadStoredFile(path: string, file: File, contentType: string) {
  const response = await fetch(storageUrl(path), {
    method: "POST",
    headers: authHeaders({
      "Content-Type": contentType,
      "Cache-Control": "max-age=3600",
      "x-upsert": "false",
    }),
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    throw new Error(`Supabase upload failed: ${await storageError(response)}`);
  }
}

export async function downloadStoredFile(path: string) {
  const response = await fetch(storageUrl(path), {
    method: "GET",
    headers: authHeaders(),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Supabase download failed: ${await storageError(response)}`);
  }
  return response;
}

export async function deleteStoredFiles(paths: string[]) {
  if (!paths.length) return;
  const { url, bucket } = config();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: paths }),
  });

  if (!response.ok) {
    throw new Error(`Supabase delete failed: ${await storageError(response)}`);
  }
}
