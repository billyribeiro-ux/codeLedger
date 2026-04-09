import type { LangDef, MasteryDef, Profile, ProgressMap } from "./types";

/** Dark workspace palettes — app shell, sidebar, and card surfaces. */
export interface WorkspaceTheme {
  id: string;
  label: string;
  app: string;
  main: string;
  sidebar: string;
  sidebarBorder: string;
  panel: string;
  panelDeep: string;
  border: string;
  borderSoft: string;
  navActive: string;
  inputBg: string;
  /** Modals / command palette base */
  elevated: string;
}

export const WORKSPACE_THEMES: WorkspaceTheme[] = [
  {
    id: "midnight",
    label: "Midnight",
    app: "#080808",
    main: "#080808",
    sidebar: "#0b0b0b",
    sidebarBorder: "#151515",
    panel: "#0d0d0d",
    panelDeep: "#0a0a0a",
    border: "#161616",
    borderSoft: "#1a1a1a",
    navActive: "#141414",
    inputBg: "#0a0a0a",
    elevated: "#111111",
  },
  {
    id: "void",
    label: "Void",
    app: "#050507",
    main: "#050507",
    sidebar: "#08080c",
    sidebarBorder: "#12121a",
    panel: "#0c0c12",
    panelDeep: "#08080f",
    border: "#1a1a24",
    borderSoft: "#22222e",
    navActive: "#12121c",
    inputBg: "#0a0a10",
    elevated: "#101018",
  },
  {
    id: "slate",
    label: "Slate",
    app: "#0f1115",
    main: "#0f1115",
    sidebar: "#0c0e12",
    sidebarBorder: "#1a1f28",
    panel: "#141820",
    panelDeep: "#0e1218",
    border: "#1e2530",
    borderSoft: "#252d3a",
    navActive: "#1a222e",
    inputBg: "#10141c",
    elevated: "#181e28",
  },
  {
    id: "ocean",
    label: "Ocean",
    app: "#061016",
    main: "#071218",
    sidebar: "#050e14",
    sidebarBorder: "#0f2430",
    panel: "#0a1820",
    panelDeep: "#06121a",
    border: "#143040",
    borderSoft: "#1a3848",
    navActive: "#0f2834",
    inputBg: "#08161e",
    elevated: "#0c1c28",
  },
  {
    id: "wine",
    label: "Wine",
    app: "#100a12",
    main: "#100a12",
    sidebar: "#0d080f",
    sidebarBorder: "#201820",
    panel: "#160f18",
    panelDeep: "#110a14",
    border: "#251c28",
    borderSoft: "#2e2432",
    navActive: "#1c1520",
    inputBg: "#120c14",
    elevated: "#181018",
  },
  {
    id: "ember",
    label: "Ember",
    app: "#100c08",
    main: "#100c08",
    sidebar: "#0e0a06",
    sidebarBorder: "#241c14",
    panel: "#161208",
    panelDeep: "#100c08",
    border: "#2a2018",
    borderSoft: "#322820",
    navActive: "#201810",
    inputBg: "#140f0a",
    elevated: "#1a1410",
  },
];

export const WORKSPACE_THEME_MAP: Record<string, WorkspaceTheme> = Object.fromEntries(
  WORKSPACE_THEMES.map((t) => [t.id, t])
);

export function resolveWorkspaceTheme(id: string | undefined): WorkspaceTheme {
  if (id && WORKSPACE_THEME_MAP[id]) return WORKSPACE_THEME_MAP[id];
  return WORKSPACE_THEMES[0];
}

/** CSS custom properties for the root shell (spread onto `.cl-app`). */
export function workspaceThemeVars(t: WorkspaceTheme): Record<string, string> {
  return {
    "--cl-theme-app": t.app,
    "--cl-theme-main": t.main,
    "--cl-theme-sidebar": t.sidebar,
    "--cl-theme-sidebar-border": t.sidebarBorder,
    "--cl-theme-panel": t.panel,
    "--cl-theme-panel-deep": t.panelDeep,
    "--cl-theme-border": t.border,
    "--cl-theme-border-soft": t.borderSoft,
    "--cl-theme-nav-active": t.navActive,
    "--cl-theme-input-bg": t.inputBg,
    "--cl-theme-elevated": t.elevated,
  };
}

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
  workspaceThemeId: "midnight",
});

export function mergeProfileWithDefaults(loaded: Partial<Profile> | null | undefined): Profile {
  const d = defaultProfile();
  if (!loaded) return d;
  const wid =
    loaded.workspaceThemeId && WORKSPACE_THEME_MAP[loaded.workspaceThemeId]
      ? loaded.workspaceThemeId
      : d.workspaceThemeId;
  return {
    ...d,
    ...loaded,
    workspaceThemeId: wid,
  };
}

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
