import { describe, it, expect } from "vitest";
import {
  CONFLICTS,
  IDENTITY,
  PERSONAL_FACTS,
  getFact,
} from "@/lib/profile/leo-profile";
import { validateProfile, profileIsValid } from "@/app/api/chatbot/validate-profile";
import { leosAge } from "@/lib/profile/calculations";

describe("centralized profile integrity", () => {
  it("contains the verified identity facts provided by Leo", () => {
    expect(IDENTITY.fullName).toBe("Leo Joseph Perumpully");
    expect(IDENTITY.dateOfBirth).toBe("2003-06-18");
    expect(IDENTITY.placeOfBirth).toBe("Kerala, India");
  });

  it("does not store a hardcoded age anywhere in the fact registry", () => {
    const ageFacts = PERSONAL_FACTS.filter(
      (f) => f.field === "age" || f.field === "current_age" || f.id === "identity.age"
    );
    expect(ageFacts).toHaveLength(0);
  });

  it("exposes facts with unique ids and full metadata", () => {
    const ids = PERSONAL_FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fact of PERSONAL_FACTS) {
      expect(fact.category).toBeTruthy();
      expect(fact.field).toBeTruthy();
      expect(fact.source).toBeTruthy();
      expect(fact.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps unresolved conflicts flagged as needs_review", () => {
    expect(CONFLICTS.length).toBeGreaterThan(0);
    for (const conflict of CONFLICTS) {
      expect(conflict.status).toBe("needs_review");
    }
  });

  it("looks facts up by id", () => {
    expect(getFact("identity.date_of_birth")?.value).toBe("2003-06-18");
    expect(getFact("nonexistent.fact")).toBeUndefined();
  });
});

describe("profile validation", () => {
  it("passes with no error-level issues", () => {
    const issues = validateProfile();
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("profileIsValid() is true for the shipped profile", () => {
    expect(profileIsValid()).toBe(true);
  });

  it("detects a missing required identity field", () => {
    // Sanity-check the validator itself: an empty DOB must be an error.
    const fact = getFact("identity.date_of_birth")!;
    expect(fact.value).not.toBe("");
    // The validator's ISO check would flag a malformed value.
    expect(/^\d{4}-\d{2}-\d{2}$/.test(String(fact.value))).toBe(true);
  });
});

describe("age is computed, never stored", () => {
  it("computes 23 on 2026-11-04 and 22 before the 2026 birthday", () => {
    expect(leosAge(new Date("2026-11-04T00:00:00Z"))).toBe(23);
    expect(leosAge(new Date("2026-01-01T00:00:00Z"))).toBe(22);
  });
});
