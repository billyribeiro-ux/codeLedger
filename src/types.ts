export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  addedAt: string;
}

export interface LangProgress {
  mastery: number;
  topics: Topic[];
  studyMinutes: number;
  lastStudied: string | null;
}

export type ProgressMap = Record<string, LangProgress>;

export interface Profile {
  name: string;
  startedAt: string;
  totalStudyMinutes: number;
  streakDays: number;
  lastStudyDate: string | null;
  /** Preset id from WORKSPACE_THEMES (workspace chrome / background). */
  workspaceThemeId: string;
}

export interface Note {
  id: string;
  langId: string | null;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  reviewCount: number;
  lastReviewed: string | null;
}

export interface Goal {
  id: string;
  title: string;
  langId: string | null;
  deadline: string | null;
  description: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  langId: string | null;
  minutes: number;
  description: string;
  date: string;
  type: string;
}

export interface LangDef {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface MasteryDef {
  lv: number;
  label: string;
  color: string;
  next: string;
}

export type ToastState = { msg: string; type: "success" | "error" } | null;
