/**
 * Personal-fact retrieval service (Layer A retrieval).
 *
 * Determines which verified facts a question needs and returns them as
 * plain-English lines, including deterministic calculations (age,
 * employment durations, total experience). Descriptive detail (project
 * explanations, responsibilities, skills) still comes from the existing
 * knowledge base in app/api/chatbot/knowledge.ts (Layer B).
 *
 * Only relevant lines are returned — the entire profile is never sent to
 * Gemini for every question.
 */

import {
  ABOUT_SUMMARY,
  ACHIEVEMENTS,
  CERTIFICATIONS,
  CONTACT,
  CURRENT_EMPLOYER,
  EDUCATION,
  EMPLOYMENT,
  IDENTITY,
  INTERESTS,
  PUBLICATIONS,
  PROJECTS,
  SOFT_SKILLS,
  TECHNICAL_SKILLS,
} from "@/lib/profile/leo-profile";
import {
  academicTimeline,
  employmentDuration,
  leosAge,
  totalProfessionalExperience,
} from "@/lib/profile/calculations";
import type { Employment } from "@/lib/profile/leo-profile";

export interface FactBundle {
  /** Deterministic verified-fact lines to inject into the system prompt. */
  lines: string[];
}

type Topic =
  | "identity"
  | "age"
  | "origin"
  | "contact"
  | "education"
  | "current_job"
  | "previous_job"
  | "internships"
  | "experience_duration"
  | "skills"
  | "soft_skills"
  | "projects"
  | "certifications"
  | "achievements"
  | "publications"
  | "interests"
  | "summary";

interface TopicMatcher {
  topic: Topic;
  keywords: string[];
}

/**
 * Deterministic keyword routing for structured facts. Long multi-word
 * phrases are matched on the raw lowercase query; single words go through
 * the same simple stemming used by the knowledge base.
 */
const MATCHERS: TopicMatcher[] = [
  { topic: "age", keywords: ["how old", "age", "your age", "birthday", "born", "birth date", "date of birth", "dob"] },
  { topic: "identity", keywords: ["who are you", "your name", "full name", "are you leo", "about you", "yourself", "introduce"] },
  { topic: "origin", keywords: ["where are you from", "where do you live", "nationality", "from india", "home town", "hometown", "based"] },
  { topic: "contact", keywords: ["contact", "email", "phone", "reach you", "linkedin", "github", "hire", "freelance"] },
  { topic: "education", keywords: ["study", "studied", "education", "degree", "university", "college", "btech", "b.tech", "karunya", "cgpa", "gpa", "grade", "graduate", "graduation", "school", "academic", "specialization", "specialise", "major", "field of study"] },
  { topic: "current_job", keywords: ["where do you work", "current job", "current company", "right now", "currently", "your job", "your work", "your role", "your company", "al-nassim", "alnassim", "nassim", "employer", "your team", "your office", "job title", "position", "occupation", "what do you do", "work as", "do for a living"] },
  { topic: "previous_job", keywords: ["previous job", "previous company", "before", "used to work", "last job", "qb tech", "earlier job", "past job", "worked before", "elsewhere", "other compan", "career history", "work history", "previous role", "previous work"] },
  { topic: "internships", keywords: ["internship", "intern", "workcohol", "blk", "british link"] },
  { topic: "experience_duration", keywords: ["how long", "how many years", "experience", "since when", "when did you join", "joined", "tenure", "working there"] },
  { topic: "skills", keywords: ["skill", "tech stack", "stack", "technology", "technologies", "programming", "language", "python", "javascript", "react", "sql", "flask", "strongest", "good at", "proficien"] },
  { topic: "soft_skills", keywords: ["soft skill", "team", "communication", "collaborate", "strength"] },
  { topic: "projects", keywords: ["project", "built", "build", "portfolio", "aquanutri", "quiz", "cardio", "asthma", "mental health", "sentiment", "app", "application"] },
  { topic: "certifications", keywords: ["certification", "certificate", "certified", "azure", "aws", "cisco", "coursera", "badge", "credential"] },
  { topic: "achievements", keywords: ["award", "achievement", "honour", "honor", "winner", "presenter", "finalist", "startup challenge"] },
  { topic: "publications", keywords: ["publication", "paper", "journal", "research", "provincia", "conference", "published"] },
  { topic: "interests", keywords: ["hobby", "hobbies", "interest", "free time", "passion", "goal", "career goal", "enjoy"] },
  { topic: "summary", keywords: ["tell me about yourself", "summary", "overview", "background"] },
];

function stem(word: string): string {
  return word
    .replace(/ies$/, "y")
    .replace(/(sses|shes|ches|xes)$/, (m) => m.slice(0, -2))
    .replace(/s$/, "");
}

/** Exposed for tests: which fact topics does a query trigger? */
export function matchTopics(query: string): Set<Topic> {
  const q = query.toLowerCase();
  const tokens = new Set(
    q
      .replace(/[^a-z0-9.+#\- ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .map(stem)
  );
  const topics = new Set<Topic>();
  for (const m of MATCHERS) {
    for (const kw of m.keywords) {
      const hit =
        kw.includes(" ")
          ? q.includes(kw)
          : tokens.has(stem(kw)) ||
            // Prefix fallback for inflections ("certificates" ↔ "certificate").
            // Require 5+ chars so short words like "your"/"job" never
            // prefix-match unrelated keywords ("yourself", "objective").
            [...tokens].some(
              (t) =>
                t.length >= 5 &&
                stem(kw).length >= 5 &&
                (t.startsWith(stem(kw)) || stem(kw).startsWith(t))
            );
      if (hit) {
        topics.add(m.topic);
        break;
      }
    }
  }
  return topics;
}

function jobLine(job: Employment, now: Date): string {
  const dur = employmentDuration(job, now) ?? "duration unknown";
  const period = job.endDate ? `${job.startDate} to ${job.endDate}` : `since ${job.startDate}`;
  const kind = job.type === "internship" ? "Internship" : "Full-time role";
  return (
    `${kind}: ${job.title} at ${job.employer} (${job.location}), ${period} (${dur}). ` +
    `Responsibilities: ${job.responsibilities.join("; ")}.` +
    (job.highlights ? ` Highlights: ${job.highlights.join("; ")}.` : "")
  );
}

/**
 * Retrieve the verified personal facts needed for `query`, plus the
 * deterministic calculations relevant to the detected topics.
 */
export function retrievePersonalFacts(
  query: string,
  now: Date = new Date(),
  /** Recent user messages, used to catch follow-ups like "how long has it been?" */
  recentContext: string[] = []
): FactBundle {
  const combined = [...recentContext, query].join(" ");
  const topics = matchTopics(combined);
  const lines: string[] = [];

  // Identity is always injected in some form — it is the anchor of the
  // first-person persona.
  if (topics.has("identity") || topics.has("summary")) {
    lines.push(
      `Your identity: ${IDENTITY.fullName} (goes by ${IDENTITY.shortName}). You speak as Leo in the first person, always.`
    );
  }

  if (topics.has("age")) {
    const age = leosAge(now);
    if (age !== null) {
      lines.push(
        `Verified: you were born on June 18, 2003 (${IDENTITY.dateOfBirth}) in ${IDENTITY.placeOfBirth}. Computed for you: as of ${now.toISOString().slice(0, 10)}, you are ${age} years old. This is PUBLIC verified information — always share it directly when asked about your age, birthdate, birthday or birth year (year: 2003; birthday: June 18). State this as YOUR age in the first person.`
      );
    }
  }

  if (topics.has("origin")) {
    lines.push(
      `Verified: born in ${IDENTITY.placeOfBirth}; nationality ${IDENTITY.nationality}; home address ${IDENTITY.homeAddress}.`
    );
  }

  if (topics.has("contact")) {
    lines.push(
      `Verified contact: email ${CONTACT.email}; phone ${CONTACT.phone}; GitHub ${CONTACT.github}; portfolio ${CONTACT.portfolio}. LinkedIn: ${CONTACT.linkedin} (a resume variant ${CONTACT.linkedinAlternate} exists — if asked, say it is your LinkedIn profile). Available for freelance work: yes.`
    );
  }

  if (topics.has("education")) {
    const timeline = academicTimeline(now);
    lines.push(
      `Verified education: ${EDUCATION.degree} with specialization in ${EDUCATION.specialization}, ${EDUCATION.university}, ${EDUCATION.universityLocation} (${EDUCATION.startDate} to ${EDUCATION.graduationDate}); final grade ${EDUCATION.cgpa} CGPA (EQF level ${EDUCATION.cgpaEqfLevel}).` +
        (timeline
          ? ` Computed for you: you graduated on ${timeline.graduated} — that is ${timeline.yearsSinceGraduation} year(s) before ${now.toISOString().slice(0, 10)}; the degree took ${timeline.degreeDuration}.`
          : "")
    );
  }

  if (topics.has("current_job")) {
    lines.push(`Verified current role: ${jobLine(CURRENT_EMPLOYER, now)}`);
    lines.push(
      `Boundary: you can describe the work you do at ${CURRENT_EMPLOYER.employer}, but you have NO verified information about the company's internal culture, salaries, team morale or overall working environment. Say so honestly if asked.`
    );
  }

  if (topics.has("previous_job")) {
    const previous = EMPLOYMENT.filter((j) => j !== CURRENT_EMPLOYER);
    for (const job of previous) lines.push(`Verified: ${jobLine(job, now)}`);
  }

  if (topics.has("internships")) {
    const internships = EMPLOYMENT.filter((j) => j.type === "internship");
    for (const job of internships) lines.push(`Verified internship: ${jobLine(job, now)}`);
  }

  if (topics.has("experience_duration")) {
    const fullTime = totalProfessionalExperience(EMPLOYMENT, now, false);
    const withInternships = totalProfessionalExperience(EMPLOYMENT, now, true);
    if (fullTime) {
      lines.push(
        `Computed for you: total verified full-time professional experience is ${fullTime.human} (since ${fullTime.since}, overlapping periods merged). Counting internships as well: ${withInternships?.human}. Distinguish the two if the question is ambiguous.`
      );
    }
    const currentDur = employmentDuration(CURRENT_EMPLOYER, now);
    if (currentDur) {
      lines.push(`Computed for you: you have been at ${CURRENT_EMPLOYER.employer} for ${currentDur} (since ${CURRENT_EMPLOYER.startDate}).`);
    }
  }

  if (topics.has("skills")) {
    const top = [...TECHNICAL_SKILLS.proficiency].sort((a, b) => b.level - a.level);
    lines.push(
      `Verified skills (portfolio proficiency levels): ${top.map((s) => `${s.name} (${s.level}%)`).join(", ")}. Also worked with: ${TECHNICAL_SKILLS.alsoWorkedWith.join(", ")}. Core domains: ${TECHNICAL_SKILLS.domains.join(", ")}. Languages: ${TECHNICAL_SKILLS.languages.map((l) => `${l.name} (${l.level})`).join(", ")}.`
    );
  }

  if (topics.has("soft_skills")) {
    lines.push(`Verified soft skills: ${SOFT_SKILLS.join("; ")}.`);
  }

  if (topics.has("projects")) {
    lines.push(
      `Verified projects: ${PROJECTS.map((p) => `${p.name} — ${p.tagline} (${p.startDate.slice(0, 4)})${p.url ? ` ${p.url}` : ""}`).join(" | ")}. Detailed descriptions come from the knowledge base.`
    );
  }

  if (topics.has("certifications")) {
    lines.push(
      `Verified certifications: ${CERTIFICATIONS.map((c) => `${c.name} (${c.issuer}, ${c.date})`).join("; ")}.`
    );
  }

  if (topics.has("achievements")) {
    lines.push(
      `Verified achievements: ${ACHIEVEMENTS.map((a) => `${a.title} at ${a.event} (${a.date})`).join("; ")}.`
    );
  }

  if (topics.has("publications")) {
    lines.push(
      `Verified publications: ${PUBLICATIONS.map((p) => `"${p.title}", ${p.authors}, ${p.venue}`).join("; ")}. A second paper was submitted to Bentham Science Publishers; a third research work is ongoing. Conference presentation: AQUANUTRI at AGAIQCSD-2024 (New Delhi, 2024-10-01 to 2024-10-03).`
    );
  }

  if (topics.has("interests")) {
    lines.push(
      `Verified interests — hobbies: ${INTERESTS.hobbies.join(", ")}. Professional areas: ${INTERESTS.professionalAreas.join(", ")}. Career direction: ${INTERESTS.careerGoal}`
    );
  }

  if (topics.has("summary")) {
    lines.push(`Verified self-summary you can use verbatim: ${ABOUT_SUMMARY}`);
  }

  // Fallback: if nothing matched, give the model the identity anchor plus
  // the high-level summary so it can still answer naturally as Leo.
  if (!lines.length) {
    lines.push(
      `Your identity: ${IDENTITY.fullName}. ${ABOUT_SUMMARY}`
    );
  }

  return { lines };
}
