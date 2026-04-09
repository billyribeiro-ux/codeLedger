import { describe, expect, it } from "vitest";
import { backupSchema } from "./schema";

describe("backupSchema", () => {
  it("accepts a minimal v3 backup", () => {
    const parsed = backupSchema.safeParse({
      version: 3,
      profile: {
        name: "Ada",
        startedAt: "2026-01-01T00:00:00.000Z",
        totalStudyMinutes: 120,
        streakDays: 3,
        lastStudyDate: "2026-04-09T12:00:00.000Z",
      },
      progress: { ts: { mastery: 2, topics: [], studyMinutes: 60, lastStudied: null } },
      notes: [],
      goals: [],
      sessions: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid profile shape", () => {
    const parsed = backupSchema.safeParse({
      profile: { name: 123 },
    });
    expect(parsed.success).toBe(false);
  });
});
