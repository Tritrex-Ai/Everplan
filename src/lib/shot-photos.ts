import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_HINT = "Storage bucket is not configured. Run the storage_setup.sql migration.";

/** Uploads reference photos for a shot into shot-photos at
 * {event_id}/{shot_id}/{uuid}.{ext} (the path convention the storage RLS
 * policies key off). Returns the paths that made it, plus one error message
 * if any file failed — callers decide whether partial success is fine. */
export async function uploadShotPhotos(
  supabase: SupabaseClient,
  eventId: string,
  shotId: string,
  files: File[]
): Promise<{ paths: string[]; error: string | null }> {
  const paths: string[] = [];
  let error: string | null = null;

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${eventId}/${shotId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("shot-photos").upload(path, file);
    if (uploadError) {
      const m = uploadError.message;
      error =
        m.includes("Bucket not found") || m.includes("row-level security") ? BUCKET_HINT : m;
      continue;
    }
    paths.push(path);
  }

  return { paths, error };
}
