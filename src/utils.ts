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
