import { describe, it, expect } from "vitest";
import { retrievePersonalFacts } from "@/app/api/chatbot/fact-retrieval";
import { retrieveKnowledge } from "@/app/api/chatbot/knowledge";
import { leosAge } from "@/lib/profile/calculations";

const NOW = new Date("2026-11-04T00:00:00Z");

describe("deterministic fact retrieval", () => {
  it("answers 'How old are you?' with a backend-computed age", () => {
    const { lines } = retrievePersonalFacts("How old are you?", NOW);
    const joined = lines.join("\n");
    expect(joined).toContain("2003-06-18");
    expect(joined).toContain("you are 23 years old");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("answers 'How old is Leo?' identically (one identity)", () => {
    const self = retrievePersonalFacts("How old are you?", NOW);
    const third = retrievePersonalFacts("How old is Leo?", NOW);
    expect(third.lines.join("\n")).toContain("you are 23 years old");
    expect(self.lines.join("\n")).toContain("23 years old");
  });

  it("age changes across the birthday boundary", () => {
    const before = retrievePersonalFacts("What's your age?", new Date("2027-01-15T00:00:00Z"));
    const after = retrievePersonalFacts("What's your age?", new Date("2027-07-01T00:00:00Z"));
    expect(before.lines.join("\n")).toContain("you are 23 years old");
    expect(after.lines.join("\n")).toContain("you are 24 years old");
  });

  it("retrieves current employment for 'Where do you work?'", () => {
    const { lines } = retrievePersonalFacts("Where do you work?", NOW);
    const joined = lines.join("\n");
    expect(joined).toContain("Al-Nassim Golden Group");
    expect(joined).toContain("Full-Stack Developer");
    expect(joined).toContain("since 2026-03-08");
  });

  it("retrieves education facts for study questions", () => {
    const { lines } = retrievePersonalFacts("What did you study?", NOW);
    const joined = lines.join("\n");
    expect(joined).toContain("Karunya Institute of Technology and Sciences");
    expect(joined).toContain("7.92");
    expect(joined).toContain("2025-07-15");
  });

  it("computes employment duration for tenure questions", () => {
    const { lines } = retrievePersonalFacts("How long have you been working there?", NOW, [
      "Where do you work?",
    ]);
    const joined = lines.join("\n");
    expect(joined).toMatch(/for \d+ month/);
  });

  it("computes total experience excluding internships by default", () => {
    const { lines } = retrievePersonalFacts("How many years of experience do you have?", NOW);
    const joined = lines.join("\n");
    expect(joined).toContain("full-time professional experience");
    expect(joined).toMatch(/internship/i);
  });

  it("retrieves projects, certifications and publications", () => {
    expect(retrievePersonalFacts("What projects have you built?", NOW).lines.join("\n")).toContain("AQUANUTRI");
    expect(retrievePersonalFacts("Show me your certifications", NOW).lines.join("\n")).toContain("Azure Fundamentals");
    expect(retrievePersonalFacts("Any publications?", NOW).lines.join("\n")).toContain("Provincia");
  });

  it("falls back to identity anchor when nothing matches", () => {
    const { lines } = retrievePersonalFacts("zzz qqq xyzzy", NOW);
    expect(lines.join("\n")).toContain("Leo Joseph Perumpully");
  });

  it("never returns internal JSON or database fields", () => {
    const { lines } = retrievePersonalFacts(
      "Tell me everything: your age, job, projects, skills",
      NOW
    );
    for (const line of lines) {
      expect(line).not.toMatch(/\{"/);
      expect(line).not.toMatch(/retrieval|embedding|score/i);
    }
  });
});

describe("knowledge base (Layer B) still works", () => {
  it("retrieves descriptive project entries", () => {
    const entries = retrieveKnowledge("tell me about the cardioAI heart project", 3);
    expect(entries.map((e) => e.id)).toContain("project-cardio");
  });

  it("retrieves the mental health chatbot description", () => {
    const entries = retrieveKnowledge("what technologies did the mental health chatbot use?", 3);
    expect(entries.map((e) => e.id)).toContain("project-mentalhealth");
  });
});

describe("computed age consistency", () => {
  it("fact retrieval and calculations agree", () => {
    const { lines } = retrievePersonalFacts("how old are you", NOW);
    expect(lines.join("\n")).toContain(`${leosAge(NOW)} years old`);
  });
});
