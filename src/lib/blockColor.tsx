import {
  Scissor01Icon,
  Diamond01Icon,
  UserGroupIcon,
  Camera01Icon,
  Home01Icon,
  Activity01Icon,
  SquareIcon,
} from "hugeicons-react";

// Each branch renders its own statically-named icon tag rather than
// selecting a component reference into a variable — the latter trips the
// "no components created during render" lint rule, since static analysis
// can't tell a fixed set of hoisted icon components from a dynamically
// created one.
export function BlockIcon({ title, size = 20, className }: { title: string; size?: number; className?: string }) {
  const t = title.toLowerCase();
  if (t.includes("hair") || t.includes("makeup") || t.includes("prep"))
    return <Scissor01Icon size={size} className={className} />;
  if (t.includes("dress") || t.includes("ring") || t.includes("detail"))
    return <Diamond01Icon size={size} className={className} />;
  if (t.includes("family") || t.includes("party") || t.includes("group"))
    return <UserGroupIcon size={size} className={className} />;
  if (t.includes("photo") || t.includes("portrait") || t.includes("shot"))
    return <Camera01Icon size={size} className={className} />;
  if (t.includes("ceremony") || t.includes("venue") || t.includes("arrive"))
    return <Home01Icon size={size} className={className} />;
  if (t.includes("dance") || t.includes("party") || t.includes("cocktail"))
    return <Activity01Icon size={size} className={className} />;
  return <SquareIcon size={size} className={className} />;
}

/** Category color, as a badge tint (background) + matching icon/text color —
 * used together so a block's marker is a single icon-in-circle indicator
 * instead of a separate color rail plus a separate gray icon chip. */
export function getBlockColor(title: string) {
  const t = title.toLowerCase();
  if (t.includes("ceremony") || t.includes("vow"))
    return { tint: "bg-amber-400/15", ink: "text-amber-500" };
  if (t.includes("hair") || t.includes("prep") || t.includes("makeup"))
    return { tint: "bg-emerald-400/15", ink: "text-emerald-500" };
  if (t.includes("photo") || t.includes("portrait") || t.includes("shot"))
    return { tint: "bg-purple-400/15", ink: "text-purple-400" };
  if (t.includes("dance") || t.includes("party") || t.includes("dj"))
    return { tint: "bg-rose-400/15", ink: "text-rose-400" };
  if (t.includes("dinner") || t.includes("cake") || t.includes("cocktail"))
    return { tint: "bg-cyan-400/15", ink: "text-cyan-400" };
  return { tint: "bg-accent-tint", ink: "text-accent" };
}
