import type { MemberRole, ShotRow } from "@/lib/types";

/** The three views the UI actually renders: full control, "build your own
 * private shot list against someone else's event," and read-only. Vendor,
 * coordinator, and couple are all "readonly" today — distinct DB roles kept
 * for labeling, collapsed to one capability tier here. */
export type ViewerRole = "owner" | "team" | "readonly";

export function resolveViewerRole(
  isOwner: boolean,
  dbRole: MemberRole | null
): ViewerRole {
  if (isOwner) return "owner";
  if (dbRole === "team") return "team";
  return "readonly";
}

export function canCreateShots(role: ViewerRole): boolean {
  return role === "owner" || role === "team";
}

export function canWriteBlocks(role: ViewerRole): boolean {
  return role === "owner" || role === "team";
}

/** Content edits (title/description/priority/photos), re-sharing, and
 * delete — creator or owner only. */
export function canEditShot(
  role: ViewerRole,
  shot: Pick<ShotRow, "created_by">,
  userId: string
): boolean {
  return role === "owner" || shot.created_by === userId;
}

/** Toggling captured/planned — the collaborative "check it off during the
 * event" action. Broader than canEditShot: any team member may toggle a
 * shot that's visible to them, since by construction anything they can see
 * that isn't their own is already shared with them. */
export function canToggleShotStatus(role: ViewerRole): boolean {
  return role !== "readonly";
}
