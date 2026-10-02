/** Turns whatever a user pasted into a safe http(s) URL, or null. Only
 * http/https are ever allowed — these end up in an href, so a pasted
 * `javascript:` or `data:` URL must never survive. A bare "pinterest.com/x"
 * gets https:// prepended. */
export function normalizeLink(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
