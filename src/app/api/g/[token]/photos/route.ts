import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE_BYTES = 8 * 1024 * 1024;

async function resolveGuestEvent(admin: ReturnType<typeof createAdminClient>, token: string) {
  const { data: event } = await admin
    .from("events")
    .select("id, guest_token")
    .eq("guest_token", token)
    .maybeSingle();
  // guest_token is nullable and unique — a null column value can never equal
  // a non-null token, but this makes "sharing is currently off" explicit.
  return event && event.guest_token ? event : null;
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const event = await resolveGuestEvent(admin, token);
  if (!event) {
    return NextResponse.json({ error: "This guest link is no longer active." }, { status: 404 });
  }

  const { data: rows } = await admin
    .from("event_images")
    .select("id, storage_path, caption, guest_name")
    .eq("event_id", event.id)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const photos = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data } = await admin.storage
        .from("guest-photos")
        .createSignedUrl(row.storage_path, 3600);
      return {
        id: row.id,
        url: data?.signedUrl ?? "",
        caption: row.caption,
        guestName: row.guest_name,
      };
    })
  );

  return NextResponse.json({ photos: photos.filter((p) => p.url) });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const event = await resolveGuestEvent(admin, token);
  if (!event) {
    return NextResponse.json({ error: "This guest link is no longer active." }, { status: 404 });
  }

  // Keyed by IP, not user — guests are anonymous. This is the most
  // abuse-exposed endpoint in the app (anonymous + file upload), so it gets
  // the tightest limit.
  const withinLimit = await checkRateLimit(`ip:${clientIp(request)}:guest-upload`, 20, 3600);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many uploads from this connection — please wait a bit and try again." },
      { status: 429 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPEG, PNG, WebP, or GIF image." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "That image is too large — max 8MB." }, { status: 400 });
  }

  const guestName = (formData?.get("guestName") as string | null)?.trim().slice(0, 80) || null;
  const caption = (formData?.get("caption") as string | null)?.trim().slice(0, 200) || null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${event.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("guest-photos")
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { error: insertError } = await admin.from("event_images").insert({
    event_id: event.id,
    storage_path: path,
    guest_name: guestName,
    caption,
    approved: false,
  });
  if (insertError) {
    await admin.storage.from("guest-photos").remove([path]);
    return NextResponse.json(
      { error: `Couldn't save that photo: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
