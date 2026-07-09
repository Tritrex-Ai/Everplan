export type MemberRole = "owner" | "team" | "vendor" | "client" | "coordinator" | "couple";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

export type EventRow = {
  id: string;
  owner_id: string;
  title: string;
  event_type: string;
  date: string; // yyyy-mm-dd
  location: string | null;
  couple_names: string | null;
  guest_count: number | null;
  coverage_needed: string[];
  cover_image_url: string | null;
  guest_token: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  invited_email: string;
  role: MemberRole;
  color: string;
  status: "invited" | "active";
};

export type BlockStatus = "upcoming" | "done" | "late";

export type BlockRow = {
  id: string;
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  position: number;
  location: string | null;
  notes: string | null;
  status: BlockStatus;
};

export type ShotStatus = "planned" | "captured" | "skipped";

export type ShotRow = {
  id: string;
  block_id: string;
  event_id: string;
  title: string;
  description: string | null;
  status: ShotStatus;
  visibility: "private" | "shared";
  priority: "low" | "normal" | "high";
  assignee_id: string | null;
  reference_images: string[];
  captured_by: string | null;
  captured_at: string | null;
  created_by: string;
};

/** A block as returned by the AI builder, before it is saved. */
export type DraftBlock = {
  title: string;
  start: string; // HH:MM 24h
  end: string; // HH:MM 24h
  location: string;
  notes: string;
};
