import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — cover photos run larger than avatars

async function requireOwner(eventId: string) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: event } = await userClient
    .from("events")
    .select("id, owner_id, cover_image_url")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: NextResponse.json({ error: "Event not found" }, { status: 404 }) };
  if (event.owner_id !== user.id) {
    return { error: NextResponse.json({ error: "Only the event owner can change the cover photo" }, { status: 403 }) };
  }
  return { event };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, event } = await requireOwner(id);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Please upload JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image file is too large. Maximum size is 8MB." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("event-covers")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("event-covers").getPublicUrl(filePath);
    const coverImageUrl = urlData.publicUrl;

    const { error: updateError } = await admin
      .from("events")
      .update({ cover_image_url: coverImageUrl })
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: `Failed to save cover photo: ${updateError.message}` }, { status: 500 });
    }

    // Best-effort cleanup of the previous cover so old uploads don't pile up
    // in storage — never lets a cleanup failure fail the request, since the
    // new cover is already saved and live at this point.
    if (event!.cover_image_url) {
      const prevPath = event!.cover_image_url.split("/event-covers/")[1];
      if (prevPath) await admin.storage.from("event-covers").remove([prevPath]);
    }

    return NextResponse.json({ coverImageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, event } = await requireOwner(id);
    if (error) return error;

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("events")
      .update({ cover_image_url: null })
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: `Failed to remove cover photo: ${updateError.message}` }, { status: 500 });
    }

    if (event!.cover_image_url) {
      const prevPath = event!.cover_image_url.split("/event-covers/")[1];
      if (prevPath) await admin.storage.from("event-covers").remove([prevPath]);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
