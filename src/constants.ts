import type { LangDef, MasteryDef, Profile, ProgressMap } from "./types";

export const LANGS: LangDef[] = [
  { id: "html", name: "HTML", color: "#e34c26", icon: "◇" },
  { id: "css", name: "CSS", color: "#264de4", icon: "◆" },
  { id: "js", name: "JavaScript", color: "#f7df1e", icon: "⬡" },
  { id: "ts", name: "TypeScript", color: "#3178c6", icon: "⬢" },
  { id: "svelte", name: "Svelte 5", color: "#ff3e00", icon: "◎" },
  { id: "sveltekit", name: "SvelteKit", color: "#ff5722", icon: "◉" },
  { id: "react", name: "React", color: "#61dafb", icon: "⚛" },
  { id: "vue", name: "Vue", color: "#42b883", icon: "▽" },
  { id: "rust", name: "Rust", color: "#dea584", icon: "⚙" },
  { id: "python", name: "Python", color: "#3776ab", icon: "◈" },
  { id: "go", name: "Go", color: "#00add8", icon: "▷" },
  { id: "sql", name: "SQL", color: "#e38c00", icon: "▣" },
  { id: "docker", name: "Docker", color: "#2496ed", icon: "▢" },
  { id: "git", name: "Git", color: "#f05032", icon: "⑂" },
  { id: "pinescript", name: "Pine Script", color: "#536dfe", icon: "△" },
  { id: "shell", name: "Shell/Bash", color: "#4eaa25", icon: "▶" },
  { id: "tailwind", name: "Tailwind CSS", color: "#38bdf8", icon: "〰" },
  { id: "nodejs", name: "Node.js", color: "#3c873a", icon: "◐" },
  { id: "vanilla", name: "Vanilla JS", color: "#f0db4f", icon: "✦" },
  { id: "nextjs", name: "Next.js", color: "#e4e4e4", icon: "▲" },
  { id: "gsap", name: "GSAP", color: "#88ce02", icon: "⚡" },
  { id: "throttle", name: "Throttle.js", color: "#818cf8", icon: "⏱" },
  { id: "threejs", name: "Three.js", color: "#049ef4", icon: "◊" },
];

export const LANG_MAP: Record<string, LangDef> = Object.fromEntries(
  LANGS.map((l) => [l.id, l])
);

export const MASTERY: MasteryDef[] = [
  { lv: 0, label: "Not Started", color: "#333", next: "Start learning the basics" },
  { lv: 1, label: "Aware", color: "#7c3aed", next: "Read docs, complete a tutorial" },
  { lv: 2, label: "Learning", color: "#2563eb", next: "Build something small from scratch" },
  { lv: 3, label: "Practicing", color: "#0891b2", next: "Solve problems without looking up syntax" },
  { lv: 4, label: "Competent", color: "#059669", next: "Contribute to a real project" },
  { lv: 5, label: "Proficient", color: "#d97706", next: "Teach someone else the fundamentals" },
  { lv: 6, label: "Advanced", color: "#dc2626", next: "Build production systems, handle edge cases" },
  { lv: 7, label: "Expert", color: "#f59e0b", next: "You define best practices" },
];

export const defaultProfile = (): Profile => ({
  name: "",
  startedAt: new Date().toISOString(),
  totalStudyMinutes: 0,
  streakDays: 0,
  lastStudyDate: null,
});

export const defaultProgress = (): ProgressMap =>
  LANGS.reduce<ProgressMap>((acc, l) => {
    acc[l.id] = {
      mastery: 0,
      topics: [],
      studyMinutes: 0,
      lastStudied: null,
    };
    return acc;
  }, {});

/** Merge saved progress with current LANGS so new languages get default rows. */
export const mergeProgressWithDefaults = (loaded: ProgressMap | null | undefined): ProgressMap => {
  const base = defaultProgress();
  if (!loaded) return base;
  const merged: ProgressMap = { ...base };
  for (const id of Object.keys(base)) {
    merged[id] = { ...base[id], ...loaded[id] };
  }
  return merged;
};
