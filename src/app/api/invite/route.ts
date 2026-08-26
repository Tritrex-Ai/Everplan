import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["team", "vendor", "client"]),
  color: z.string(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { eventId, email, role, color } = parsed.data;

  // Insert into DB
  const { data: member, error: insertError } = await supabase
    .from("members")
    .insert({
      event_id: eventId,
      invited_email: email.trim().toLowerCase(),
      role,
      color,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        error:
          insertError.code === "23505"
            ? "That email is already on this event."
            : insertError.message,
      },
      { status: 400 }
    );
  }

  // Send Email via Resend. The member row above is the real invite — it's
  // already active the moment the invitee signs up with this email,
  // regardless of whether this notification email lands. So a failure here
  // is reported back, not treated as the request failing.
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const roleName = role === "team" ? "Team member" : role === "client" ? "Client" : "Vendor";

    const { data: event } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();
    const eventTitle = event?.title ?? "an event";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const inviterName = profile?.full_name ?? "Someone";

    const joinUrl = `${new URL(request.url).origin}/login`;

    try {
      const { error: sendError } = await resend.emails.send({
        from: "Everplan <invites@tritrexai.com>",
        to: email,
        subject: `You've been invited to ${eventTitle} on Everplan`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2>You're invited!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the workspace for <strong>${eventTitle}</strong> as a ${roleName}.</p>
            <p>Everplan is a timeline and shot list tool for wedding photographers and videographers.</p>
            <p style="margin-top: 30px;">
              <a href="${joinUrl}" style="background-color: #5B5BD6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Accept Invitation
              </a>
            </p>
            <p style="margin-top: 30px; font-size: 13px; color: #666;">
              Sign up using this exact email address to automatically join the event workspace.
            </p>
          </div>
        `,
      });
      if (sendError) {
        console.error("Failed to send invite email", sendError);
      } else {
        emailSent = true;
      }
    } catch (e) {
      console.error("Failed to send invite email", e);
    }
  }

  return NextResponse.json({ success: true, member, emailSent });
}
