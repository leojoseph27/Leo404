import { describe, it, expect } from "vitest";
import {
  calculateAge,
  leosAge,
  parseISODate,
  employmentDuration,
  totalProfessionalExperience,
  academicTimeline,
  formatDuration,
  durationBetween,
} from "@/lib/profile/calculations";
import { EMPLOYMENT, IDENTITY } from "@/lib/profile/leo-profile";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("calculateAge", () => {
  it("computes age correctly after the birthday has occurred", () => {
    // DOB 2003-06-18; on 2026-11-04 the birthday (June 18) has passed.
    expect(calculateAge("2003-06-18", d("2026-11-04"))).toBe(23);
  });

  it("computes age correctly before the birthday in the current year", () => {
    expect(calculateAge("2003-06-18", d("2026-03-01"))).toBe(22);
  });

  it("is correct on the birthday itself", () => {
    expect(calculateAge("2003-06-18", d("2026-06-18"))).toBe(23);
  });

  it("is correct the day before the birthday", () => {
    expect(calculateAge("2003-06-18", d("2026-06-17"))).toBe(22);
  });

  it("handles leap-year birthdays", () => {
    expect(calculateAge("2004-02-29", d("2026-02-28"))).toBe(21);
    expect(calculateAge("2004-02-29", d("2028-02-29"))).toBe(24);
  });

  it("returns null for invalid dates", () => {
    expect(calculateAge("not-a-date", d("2026-01-01"))).toBeNull();
    expect(calculateAge("2003-13-40", d("2026-01-01"))).toBeNull();
  });

  it("matches Leo's authoritative DOB", () => {
    expect(IDENTITY.dateOfBirth).toBe("2003-06-18");
    expect(leosAge(d("2026-11-04"))).toBe(23);
  });
});

describe("parseISODate", () => {
  it("parses valid dates and rejects garbage", () => {
    expect(parseISODate("2026-01-31")?.getUTCDate()).toBe(31);
    expect(parseISODate("31/01/2026")).toBeNull();
    expect(parseISODate("")).toBeNull();
  });
});

describe("duration helpers", () => {
  it("formats multi-year durations", () => {
    expect(formatDuration(d("2024-01-01"), d("2025-09-01"))).toBe("1 year 8 months");
  });

  it("formats sub-year durations", () => {
    expect(formatDuration(d("2025-01-05"), d("2025-03-15"))).toBe("2 months");
  });

  it("durationBetween handles month/day rollovers", () => {
    expect(durationBetween(d("2026-01-31"), d("2026-02-28"))).toEqual({
      years: 0,
      months: 0,
      days: 28,
    });
  });
});

describe("employmentDuration", () => {
  it("computes current-job duration up to now", () => {
    const now = d("2026-11-04");
    const current = EMPLOYMENT[0]; // Al-Nassim, since 2026-03-08
    expect(employmentDuration(current, now)).toBe("7 months");
  });

  it("computes past-job durations", () => {
    const qb = EMPLOYMENT.find((j) => j.employer === "QB Tech Solutions")!;
    expect(employmentDuration(qb, d("2026-11-04"))).toBe("7 months");
  });
});

describe("totalProfessionalExperience", () => {
  it("excludes internships by default", () => {
    const result = totalProfessionalExperience(EMPLOYMENT, d("2026-11-04"), false);
    // Full-time only: QB Tech 2025-06-01..2026-01-24 (~7.7 months) +
    // Al-Nassim 2026-03-08..2026-11-04 (~8.9 months), non-overlapping.
    expect(result).not.toBeNull();
    expect(result!.months).toBeGreaterThanOrEqual(15);
    expect(result!.months).toBeLessThanOrEqual(18);
  });

  it("includes internships when explicitly requested", () => {
    const withInternships = totalProfessionalExperience(EMPLOYMENT, d("2026-11-04"), true);
    const without = totalProfessionalExperience(EMPLOYMENT, d("2026-11-04"), false);
    expect(withInternships!.months).toBeGreaterThan(without!.months);
  });

  it("merges overlapping periods (no double counting)", () => {
    const jobs = [
      {
        employer: "A",
        location: "",
        title: "",
        type: "full_time" as const,
        startDate: "2025-01-01",
        endDate: "2025-06-30",
        responsibilities: [],
      },
      {
        employer: "B",
        location: "",
        title: "",
        type: "full_time" as const,
        startDate: "2025-04-01",
        endDate: "2025-09-30",
        responsibilities: [],
      },
    ];
    // Overlap Apr-Jun must be counted once: Jan 1 - Sep 30 = ~9 months.
    const result = totalProfessionalExperience(jobs, d("2025-12-01"), true);
    expect(result!.months).toBe(9);
  });

  it("never counts a current job beyond now", () => {
    const jobs = [
      {
        employer: "Now",
        location: "",
        title: "",
        type: "full_time" as const,
        startDate: "2020-01-01",
        endDate: null,
        responsibilities: [],
      },
    ];
    const result = totalProfessionalExperience(jobs, d("2026-11-04"), true);
    expect(result!.months).toBeLessThan(84);
  });
});

describe("academicTimeline", () => {
  it("computes graduation facts deterministically", () => {
    const t = academicTimeline(d("2026-11-04"))!;
    expect(t.graduated).toBe("2025-07-15");
    expect(t.yearsSinceGraduation).toBe(1);
    expect(t.degreeDuration).toContain("year");
  });
});
