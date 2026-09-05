import { env } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";

type SupabaseStorageEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
};

function storageBucket() {
  const runtime = env as unknown as SupabaseStorageEnv;
  const url = runtime.SUPABASE_URL?.trim().replace(/\/$/, "");
  const secretKey = runtime.SUPABASE_SECRET_KEY?.trim();
  const bucketName = runtime.SUPABASE_STORAGE_BUCKET?.trim() || "hse-study-planner-files";

  if (!url || !secretKey) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  const client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return client.storage.from(bucketName);
}

export async function uploadStorageObject(
  path: string,
  file: File,
  contentType: string,
) {
  const { error } = await storageBucket().upload(path, file, {
    cacheControl: "300",
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
}

export async function downloadStorageObject(path: string) {
  const { data, error } = await storageBucket().download(path);
  if (error) throw new Error(`Supabase download failed: ${error.message}`);
  return data;
}

export async function removeStorageObjects(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const batchSize = 100;

  for (let index = 0; index < uniquePaths.length; index += batchSize) {
    const batch = uniquePaths.slice(index, index + batchSize);
    const { error } = await storageBucket().remove(batch);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }
}
