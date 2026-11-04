/**
 * Deterministic date/number calculations for Leo's personal facts.
 *
 * Gemini must never calculate these itself — the backend computes them
 * from the authoritative profile (lib/profile/leo-profile.ts) and hands
 * the finished values to the model. All functions are pure so they are
 * trivially testable.
 *
 * All ISO date math uses UTC to keep results consistent across server
 * timezones.
 */

import {
  EDUCATION,
  EMPLOYMENT,
  IDENTITY,
  type Employment,
} from "./leo-profile";

const MS_PER_DAY = 86_400_000;

/** Parse an ISO YYYY-MM-DD string into a UTC Date. Returns null if invalid. */
export function parseISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a UTC Date back to YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Age in whole years from date of birth, accounting for whether the
 * birthday has already occurred in the current year. `now` defaults to
 * the real current date — never store the result as a profile fact.
 */
export function calculateAge(dobISO: string, now: Date = new Date()): number | null {
  const dob = parseISODate(dobISO);
  if (!dob) return null;
  const nowUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  let age = nowUTC.getUTCFullYear() - dob.getUTCFullYear();
  const birthdayThisYear = new Date(
    Date.UTC(nowUTC.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate())
  );
  if (nowUTC < birthdayThisYear) age -= 1;
  return age;
}

/** Leo's current age, computed from the authoritative DOB. */
export function leosAge(now: Date = new Date()): number | null {
  return calculateAge(IDENTITY.dateOfBirth, now);
}

/** Whole years/months/days between two dates (inclusive of the start). */
export function durationBetween(start: Date, end: Date): {
  years: number;
  months: number;
  days: number;
} {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();
  if (days < 0) {
    months -= 1;
    // Days in the month preceding `end`.
    const prevMonthDays = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)
    ).getUTCDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** Human-readable duration, e.g. "1 year 8 months" / "3 months". */
export function formatDuration(start: Date, end: Date): string {
  const { years, months } = durationBetween(start, end);
  const totalMonths = years * 12 + months;
  if (totalMonths < 1) return "less than a month";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/** Duration of one job, up to `now` when still current. */
export function employmentDuration(
  job: Pick<Employment, "startDate" | "endDate">,
  now: Date = new Date()
): string | null {
  const start = parseISODate(job.startDate);
  if (!start) return null;
  const end = job.endDate ? parseISODate(job.endDate) : now;
  if (!end || end < start) return null;
  return formatDuration(start, end);
}

/**
 * Total verified professional experience, merging overlapping periods so
 * nothing is double-counted. By default internships are EXCLUDED (set
 * includeInternships=true to count them) — we never claim more experience
 * than the verified timeline supports.
 */
export function totalProfessionalExperience(
  jobs: Employment[] = EMPLOYMENT,
  now: Date = new Date(),
  includeInternships = false
): { months: number; human: string; since: string } | null {
  const relevant = jobs.filter((j) => includeInternships || j.type === "full_time");
  const periods: Array<{ start: Date; end: Date }> = [];
  for (const job of relevant) {
    const start = parseISODate(job.startDate);
    if (!start) continue;
    const end = job.endDate ? parseISODate(job.endDate) : now;
    if (!end || end < start) continue;
    periods.push({ start, end });
  }
  if (!periods.length) return null;

  // Merge overlapping/adjacent intervals.
  periods.sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Array<{ start: Date; end: Date }> = [periods[0]];
  for (const p of periods.slice(1)) {
    const last = merged[merged.length - 1];
    if (p.start.getTime() <= last.end.getTime()) {
      if (p.end > last.end) last.end = p.end;
    } else {
      merged.push(p);
    }
  }

  let totalMs = 0;
  for (const p of merged) totalMs += p.end.getTime() - p.start.getTime();
  const totalMonths = Math.round(totalMs / MS_PER_DAY / 30.4375);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const human: string[] = [];
  if (years > 0) human.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) human.push(`${months} month${months === 1 ? "" : "s"}`);

  return {
    months: totalMonths,
    human: human.length ? human.join(" ") : "less than a month",
    since: toISODate(merged[0].start),
  };
}

/**
 * Academic timeline facts (years since graduation etc.), computed so the
 * model never does date arithmetic itself.
 */
export function academicTimeline(now: Date = new Date()): {
  graduated: string;
  yearsSinceGraduation: number;
  degreeDuration: string;
} | null {
  const grad = parseISODate(EDUCATION.graduationDate);
  const start = parseISODate(EDUCATION.startDate);
  if (!grad || !start) return null;
  return {
    graduated: EDUCATION.graduationDate,
    yearsSinceGraduation: now.getUTCFullYear() - grad.getUTCFullYear(),
    degreeDuration: formatDuration(start, grad),
  };
}
