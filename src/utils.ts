export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const fmtDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const fmtDateShort = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const fmtTime = (d: string | number | Date) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export const daysSince = (d: string | number | Date | null | undefined) => {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

export const pluralize = (n: number, s: string) =>
  `${n} ${s}${n === 1 ? "" : "s"}`;

/** True when the event target is typing in a field (skip global shortcuts). */
export function isEditableElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

/** Subsequence fuzzy match: every query character appears in order in `text`. */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, "");
  let i = 0;
  for (let j = 0; j < q.length; j++) {
    const idx = t.indexOf(q[j], i);
    if (idx === -1) return false;
    i = idx + 1;
  }
  return true;
}

/** Higher score = better match for command palette ordering. */
export function matchScore(label: string, query: string): number {
  if (!query.trim()) return 1;
  const L = label.toLowerCase();
  const q = query.toLowerCase().trim();
  if (L === q) return 300;
  if (L.startsWith(q)) return 200;
  if (L.includes(q)) return 150;
  if (fuzzyMatch(L, q)) return 80;
  return 0;
}
