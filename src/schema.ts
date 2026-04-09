import { z } from "zod";

/** Validates CodeLedger JSON backup / import (v3). */
export const backupSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  profile: z
    .object({
      name: z.string(),
      startedAt: z.string(),
      totalStudyMinutes: z.number(),
      streakDays: z.number(),
      lastStudyDate: z.string().nullable(),
    })
    .optional(),
  progress: z.record(z.string(), z.unknown()).optional(),
  notes: z.array(z.unknown()).optional(),
  goals: z.array(z.unknown()).optional(),
  sessions: z.array(z.unknown()).optional(),
});

export type BackupPayload = z.infer<typeof backupSchema>;
