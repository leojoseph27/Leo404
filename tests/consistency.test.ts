/**
 * Regression tests for the contradictory-answers bug: "How old are you?"
 * once produced a refusal ("I don't share my exact age or birthdate")
 * while "When were you born?" answered directly. Root cause was a
 * model-side over-application of the generic privacy instruction — there
 * was no code-level privacy filter. These tests lock in:
 *   1. Every age/birthdate phrasing retrieves the same verified fact.
 *   2. Refusal replies are detected and trigger the corrective retry.
 *   3. Equivalent questions about other fact groups stay consistent.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { retrievePersonalFacts } from "@/app/api/chatbot/fact-retrieval";
import { leosAge } from "@/lib/profile/calculations";

const NOW = new Date("2026-11-04T00:00:00Z");

// -- Route integration (mocked Gemini) --------------------------------------

type GeminiCapture = { systemInstruction?: string };
let captured: GeminiCapture[] = [];
let replyQueue: string[] = [];

const realFetch = globalThis.fetch;

beforeAll(async () => {
  process.env.GOOGLE_API_KEY = "test-key-for-vitest";
  delete process.env.GEMINI_SERVICE_URL;

  globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("generativelanguage.googleapis.com")) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      captured.push({
        systemInstruction: body.systemInstruction?.parts?.[0]?.text,
      });
      const text = replyQueue.length ? replyQueue.shift()! : "Default answer.";
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
        { status: 200 }
      ) as unknown as globalThis.Response;
    }
    return realFetch(input);
  }) as unknown as typeof globalThis.fetch;

  routeModule = await import("@/app/api/chatbot/route");
});

let routeModule: typeof import("@/app/api/chatbot/route");

beforeEach(() => {
  captured = [];
  replyQueue = [];
});

async function ask(message: string, sessionId: string): Promise<string> {
  const res = await routeModule.POST(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    })
  );
  const data = await res.json();
  return data.reply as string;
}

describe("contradiction regression — every age/birthdate phrasing", () => {
  const QUESTIONS = [
    "How old are you?",
    "What's your age?",
    "How old is Leo?",
    "When were you born?",
    "What's your date of birth?",
    "What year were you born?",
    "When is your birthday?",
  ];

  for (const q of QUESTIONS) {
    it(`retrieves the same verified DOB fact for: "${q}"`, () => {
      const { lines } = retrievePersonalFacts(q, NOW);
      const joined = lines.join("\n");
      expect(joined).toContain("2003-06-18");
      expect(joined).toContain(`${leosAge(NOW)} years old`);
    });
  }

  it("injects the computed age into the system instruction for age questions", async () => {
    replyQueue.push("I'm 23 — born June 18, 2003.");
    await ask("How old are you?", "s-matrix-age");
    expect(captured[0].systemInstruction).toMatch(/you are 23 years old/);
  });

  it("injects the same fact for birthdate questions", async () => {
    replyQueue.push("I was born on June 18, 2003, in Kerala.");
    await ask("When were you born?", "s-matrix-dob");
    expect(captured[0].systemInstruction).toContain("2003-06-18");
  });

  it("same session, all four questions, consistent facts every time", async () => {
    for (const q of ["How old are you?", "When were you born?", "What's your date of birth?", "How old is Leo?"]) {
      replyQueue.push("Consistent answer.");
      await ask(q, "s-same-session");
    }
    for (const c of captured) {
      expect(c.systemInstruction).toContain("2003-06-18");
    }
  });

  it("separate sessions get the identical verified fact", async () => {
    const sessions = ["s-iso-1", "s-iso-2", "s-iso-3"];
    for (const s of sessions) {
      replyQueue.push("Consistent answer.");
      await ask("How old are you?", s);
    }
    for (const c of captured) {
      expect(c.systemInstruction).toContain("2003-06-18");
      expect(c.systemInstruction).toMatch(/you are 23 years old/);
    }
  });
});

describe("fact-refusal guard", () => {
  it("detects the exact refusal observed in production", async () => {
    // First Gemini reply = the reported bug. Retry must be clean.
    replyQueue.push(
      "I actually don't share my exact age or birthdate, but I graduated with my B.Tech in Computer Science with an AI specialization in July 2025!"
    );
    replyQueue.push("I'm 23 years old. I was born on June 18, 2003, in Kerala, India.");
    const reply = await ask("How old are you?", "s-refusal");
    expect(reply).toContain("23 years old");
    expect(reply).not.toMatch(/don't share/i);
    expect(captured.length).toBe(2);
    expect(captured[1].systemInstruction).toContain("CRITICAL CORRECTION");
  });

  it("detects other common refusal phrasings", async () => {
    const refusals = [
      "I prefer not to share my age, but thanks for asking!",
      "I keep my date of birth private.",
      "I'm not allowed to share my birthdate.",
      "My exact age is something I keep private.",
    ];
    for (const refusal of refusals) {
      replyQueue.push(refusal);
      replyQueue.push("I'm 23 years old, born on June 18, 2003.");
      const reply = await ask("How old are you?", "s-refusal-variants");
      expect(reply).toContain("23 years old");
    }
  });

  it("does NOT retry honest direct answers (no wasted round-trip)", async () => {
    replyQueue.push("I'm 23 years old — born on June 18, 2003 in Kerala, India.");
    await ask("How old are you?", "s-clean");
    expect(captured.length).toBe(1);
  });
});

describe("fact-group phrasing matrix — equivalent questions, same facts", () => {
  const MATRIX: Array<[string, string[], RegExp]> = [
    // [group, phrasings, expected content in the injected facts]
    ["education/graduation", ["Where did you study?", "When did you graduate?", "What's your degree?", "What was your CGPA?"], /Karunya|7\.92|2025-07-15/],
    ["university/specialization", ["Which university?", "What was your specialization?", "Tell me about your college."], /Karunya|Artificial Intelligence/],
    ["current employment", ["Where do you work?", "What's your job title?", "Who is your employer?", "What do you do now?"], /Al-Nassim Golden Group/],
    ["employment dates", ["When did you join?", "How long have you worked there?", "Since when have you been working?"], /2026-03-08|month/],
    ["previous employment", ["Tell me about your previous job.", "Where did you work before?", "Have you worked elsewhere?"], /QB Tech|Workcohol|British Link/],
    ["projects", ["What projects have you built?", "Tell me about your projects.", "What apps did you make?"], /AQUANUTRI/],
    ["certifications", ["What certifications do you have?", "Are you certified in Azure?", "Show me your certificates."], /Azure Fundamentals/],
    ["skills", ["What are your strongest skills?", "Which technologies do you know?", "What's your tech stack?"], /Python/],
    ["achievements", ["What awards have you won?", "Any achievements?", "Tell me about your honours."], /Best Presenter|SSN iFound/],
    ["location/background", ["Where are you from?", "Where do you live?", "What's your nationality?"], /Kerala|Indian/],
  ];

  for (const [group, phrasings, expected] of MATRIX) {
    it(`${group}: all phrasings retrieve consistent facts`, () => {
      for (const q of phrasings) {
        const { lines } = retrievePersonalFacts(q, NOW);
        expect(lines.join("\n")).toMatch(expected);
      }
    });
  }
});

describe("no privacy filter blocks verified facts", () => {
  it("codebase-level check: verified facts are always injected, never withheld", () => {
    // The fact-retrieval service has no path that returns an empty bundle
    // for personal questions — identity anchor is always present at minimum.
    for (const q of ["How old are you?", "When were you born?", "What's your home address?"]) {
      const { lines } = retrievePersonalFacts(q, NOW);
      expect(lines.length).toBeGreaterThan(0);
    }
  });
});
