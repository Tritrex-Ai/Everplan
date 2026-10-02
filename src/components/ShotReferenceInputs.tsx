"use client";

import { useEffect, useRef, useState } from "react";
import { Cancel01Icon, ImageAdd02Icon, Link01Icon } from "hugeicons-react";
import { linkLabel, normalizeLink } from "@/lib/shot-links";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function StagedThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  // Created inside the effect (not memoized) so StrictMode's mount/cleanup/
  // mount cycle in dev gets a fresh URL instead of one already revoked.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    queueMicrotask(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="relative aspect-square bg-surface-2 rounded-xl">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full rounded-xl object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white"
      >
        <Cancel01Icon size={14} />
      </button>
    </div>
  );
}

/** Photos picked before the shot exists — uploaded by the caller once the
 * shot row has an id (storage paths are keyed on it). */
export function StagedPhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function add(list: FileList) {
    const next: File[] = [];
    let rejected = false;
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/") || f.size > MAX_PHOTO_BYTES) rejected = true;
      else next.push(f);
    }
    setError(rejected ? "Skipped files that weren't images or were over 10MB." : null);
    onChange([...files, ...next]);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-2">
          {files.map((file, i) => (
            <StagedThumb
              key={`${file.name}-${file.lastModified}-${i}`}
              file={file}
              onRemove={() => onChange(files.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-[13.5px] font-medium text-accent-ink hover:bg-accent-tint/50"
      >
        <ImageAdd02Icon size={16} /> Add photos
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && add(e.target.files)}
      />
      {error && <p className="mt-1.5 text-[12.5px] text-warn-ink">{error}</p>}
    </div>
  );
}

/** Reference links: tappable chips plus (when editable) a paste-a-URL box.
 * Calls onChange with the full next list; the caller decides whether that's
 * just local draft state or a database write. */
export function LinkList({
  links,
  canEdit,
  onChange,
  disabled = false,
}: {
  links: string[];
  canEdit: boolean;
  onChange: (links: string[]) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!value.trim()) return;
    const url = normalizeLink(value);
    if (!url) {
      setError("That doesn't look like a web link.");
      return;
    }
    if (links.includes(url)) {
      setError("That link is already here.");
      return;
    }
    setError(null);
    setValue("");
    onChange([...links, url]);
  }

  return (
    <div>
      {links.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {links.map((url) => (
            <li
              key={url}
              className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2"
            >
              <Link01Icon size={15} className="shrink-0 text-ink-faint" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-accent-ink hover:underline"
              >
                {linkLabel(url)}
                <span className="ml-1.5 font-normal text-ink-faint">{url.replace(/^https?:\/\/(www\.)?[^/]+/, "")}</span>
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onChange(links.filter((l) => l !== url))}
                  disabled={disabled}
                  aria-label="Remove link"
                  className="shrink-0 text-ink-faint hover:text-danger disabled:opacity-50"
                >
                  <Cancel01Icon size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <>
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              inputMode="url"
              autoCapitalize="none"
              placeholder="Paste a Pinterest, Instagram or YouTube link"
              disabled={disabled}
              className="h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={add}
              disabled={disabled || !value.trim()}
              className="h-11 shrink-0 rounded-xl bg-accent-tint px-4 text-[13.5px] font-semibold text-accent-ink disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {error && <p className="mt-1.5 text-[12.5px] text-danger">{error}</p>}
        </>
      )}
    </div>
  );
}
