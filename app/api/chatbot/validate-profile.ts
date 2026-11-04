/**
 * Profile validation for the centralized Leo profile (Layer A).
 *
 * Detects developer mistakes early: missing identity fields, invalid or
 * inconsistent dates, duplicate facts, timeline problems, missing sources,
 * wrongly-verified facts, and invalid links. Runs as part of the test
 * suite; the chatbot route also logs warnings in dev so a bad profile is
 * visible immediately.
 *
 * There is deliberately NO HTTP endpoint that mutates or edits the profile.
 */

import {
  CONFLICTS,
  EDUCATION,
  EMPLOYMENT,
  IDENTITY,
  PERSONAL_FACTS,
  type PersonalFact,
} from "@/lib/profile/leo-profile";
import { parseISODate } from "@/lib/profile/calculations";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  factId?: string;
}

const REQUIRED_IDENTITY_FIELDS = [
  "identity.full_name",
  "identity.date_of_birth",
  "identity.place_of_birth",
  "identity.nationality",
] as const;

const ISO_DATE_FIELDS = ["identity.date_of_birth"];

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function dateValue(value: PersonalFact["value"]): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?: to (\d{4}-\d{2}-\d{2}|present))?$/.exec(
    String(value)
  );
  return m ? m[1] : null;
}

export function validateProfile(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // --- Required identity fields -------------------------------------------
  for (const id of REQUIRED_IDENTITY_FIELDS) {
    const fact = PERSONAL_FACTS.find((f) => f.id === id);
    if (!fact) {
      issues.push({ severity: "error", code: "missing_required_field", message: `Required identity fact "${id}" is missing from PERSONAL_FACTS.` });
    } else if (fact.value === "" || fact.value == null) {
      issues.push({ severity: "error", code: "empty_required_field", message: `Required identity fact "${id}" has an empty value.`, factId: id });
    }
  }

  // --- Duplicate facts -----------------------------------------------------
  const seenIds = new Set<string>();
  const seenFieldCategory = new Map<string, string>();
  for (const fact of PERSONAL_FACTS) {
    if (seenIds.has(fact.id)) {
      issues.push({ severity: "error", code: "duplicate_fact_id", message: `Duplicate fact id "${fact.id}".`, factId: fact.id });
    }
    seenIds.add(fact.id);
    const key = `${fact.category}::${fact.field}`;
    const firstId = seenFieldCategory.get(key);
    if (firstId && firstId !== fact.id) {
      issues.push({ severity: "warning", code: "duplicate_field", message: `Facts "${firstId}" and "${fact.id}" both cover ${key}.`, factId: fact.id });
    } else if (!firstId) {
      seenFieldCategory.set(key, fact.id);
    }
  }

  // --- Sources and status ---------------------------------------------------
  const validSources = new Set(["leo_verified", "resume_2026", "portfolio", "knowledge_base", "conversation"]);
  for (const fact of PERSONAL_FACTS) {
    if (!fact.source) {
      issues.push({ severity: "error", code: "missing_source", message: `Fact "${fact.id}" has no source reference.`, factId: fact.id });
    } else if (!validSources.has(fact.source)) {
      issues.push({ severity: "warning", code: "unknown_source", message: `Fact "${fact.id}" uses unknown source "${fact.source}".`, factId: fact.id });
    }
    if (fact.status === "verified" && fact.source === "conversation") {
      issues.push({ severity: "warning", code: "unverified_marked_verified", message: `Fact "${fact.id}" comes from conversation history and must not be marked verified.`, factId: fact.id });
    }
    if (fact.status === "verified" && !fact.lastUpdated) {
      issues.push({ severity: "warning", code: "missing_last_updated", message: `Verified fact "${fact.id}" has no lastUpdated date.`, factId: fact.id });
    }
    // ISO date fields must be real ISO dates.
    if (ISO_DATE_FIELDS.includes(fact.id) || fact.id.endsWith(".period")) {
      const raw = dateValue(fact.value);
      if (!raw) {
        issues.push({ severity: "error", code: "invalid_date_format", message: `Fact "${fact.id}" is not a valid ISO date/range: "${String(fact.value)}".`, factId: fact.id });
      } else if (!parseISODate(raw)) {
        issues.push({ severity: "error", code: "invalid_date", message: `Fact "${fact.id}" has an impossible date: "${raw}".`, factId: fact.id });
      }
    }
    // URL-shaped values must be valid links.
    if (typeof fact.value === "string" && /^https?:\/\//.test(fact.value) && !isValidUrl(fact.value)) {
      issues.push({ severity: "warning", code: "invalid_link", message: `Fact "${fact.id}" has an invalid URL: "${fact.value}".`, factId: fact.id });
    }
  }

  // --- Employment timeline consistency --------------------------------------
  for (const job of EMPLOYMENT) {
    const start = parseISODate(job.startDate);
    const end = job.endDate ? parseISODate(job.endDate) : null;
    if (!start) {
      issues.push({ severity: "error", code: "invalid_date", message: `Employment at "${job.employer}" has invalid startDate ${job.startDate}.` });
      continue;
    }
    if (job.endDate && !end) {
      issues.push({ severity: "error", code: "invalid_date", message: `Employment at "${job.employer}" has invalid endDate ${job.endDate}.` });
    } else if (end && end < start) {
      issues.push({ severity: "error", code: "timeline_conflict", message: `Employment at "${job.employer}" ends before it starts.` });
    }
  }

  // --- Education consistency -------------------------------------------------
  const dob = parseISODate(IDENTITY.dateOfBirth);
  for (const iso of [EDUCATION.startDate, EDUCATION.graduationDate]) {
    const d = parseISODate(iso);
    if (!d) {
      issues.push({ severity: "error", code: "invalid_date", message: `Education date ${iso} is invalid.` });
      continue;
    }
    if (dob && d < dob) {
      issues.push({ severity: "error", code: "education_before_birth", message: `Education date ${iso} is before the date of birth.` });
    }
  }
  const eduStart = parseISODate(EDUCATION.startDate);
  const eduEnd = parseISODate(EDUCATION.graduationDate);
  if (eduStart && eduEnd && eduEnd < eduStart) {
    issues.push({ severity: "error", code: "education_date_inconsistency", message: "Education graduation date precedes start date." });
  }

  // --- Unresolved conflicts must stay flagged --------------------------------
  if (!CONFLICTS.length) return issues;
  for (const conflict of CONFLICTS) {
    const fact = PERSONAL_FACTS.find((f) => f.id === conflict.field);
    if (fact && fact.status === "verified") {
      issues.push({ severity: "error", code: "conflict_marked_verified", message: `Fact "${conflict.field}" has a known unresolved conflict but is marked verified.`, factId: conflict.field });
    }
  }

  return issues;
}

/** True when the profile has no error-level issues. */
export function profileIsValid(): boolean {
  return validateProfile().every((i) => i.severity !== "error");
}
