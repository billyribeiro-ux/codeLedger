import { describe, expect, it } from "vitest";
import { fuzzyMatch, matchScore } from "./utils";

describe("fuzzyMatch", () => {
  it("matches subsequence", () => {
    expect(fuzzyMatch("TypeScript", "ts")).toBe(true);
    expect(fuzzyMatch("Pomodoro", "pmo")).toBe(true);
  });
  it("rejects missing chars", () => {
    expect(fuzzyMatch("abc", "z")).toBe(false);
  });
});

describe("matchScore", () => {
  it("returns positive for empty query", () => {
    expect(matchScore("anything", "")).toBeGreaterThan(0);
  });
  it("prefers prefix", () => {
    expect(matchScore("dashboard", "dash")).toBeGreaterThan(matchScore("dashboard", "oard"));
  });
});
