/**
 * Integration tests for the chatbot API route (app/api/chatbot/route.ts)
 * with a fully mocked Gemini REST transport — no network, no API quota.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

type GeminiCapture = {
  systemInstruction?: string;
  prompt?: string;
  history?: Array<{ role: string; text: string }>;
};

let captured: GeminiCapture[] = [];
let replyQueue: string[] = [];

// A Gemini REST response envelope.
function geminiReply(text: string) {
  return {
    candidates: [{ content: { parts: [{ text }] } }],
  };
}

const realFetch = globalThis.fetch;

beforeAll(async () => {
  process.env.GOOGLE_API_KEY = "test-key-for-vitest";
  delete process.env.GEMINI_SERVICE_URL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("generativelanguage.googleapis.com")) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      captured.push({
        systemInstruction: body.systemInstruction?.parts?.[0]?.text,
        prompt: body.contents?.at(-1)?.parts?.[0]?.text,
        history: (body.contents?.slice(0, -1) ?? []).map((c: any) => ({
          role: c.role,
          text: c.parts?.[0]?.text,
        })),
      });
      const text = replyQueue.length ? replyQueue.shift()! : "Default answer.";
      return new Response(JSON.stringify(geminiReply(text)), {
        status: 200,
      }) as unknown as globalThis.Response;
    }
    return realFetch(input as any);
  });

  // Import after env setup so the route binds to the direct-REST mode.
  routeModule = await import("@/app/api/chatbot/route");
});

let routeModule: typeof import("@/app/api/chatbot/route");

beforeEach(() => {
  captured = [];
  replyQueue = [];
});

function post(message: string, sessionId: string) {
  return routeModule.POST(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    })
  );
}

async function replyOf(message: string, sessionId: string) {
  const res = await post(message, sessionId);
  const data = await res.json();
  return { res, data, reply: data.reply as string };
}

describe("chatbot route — identity and facts", () => {
  it("injects the backend-computed age into the system instruction", async () => {
    replyQueue.push("I was born on June 18, 2003, so I'm 23.");
    await replyOf("How old are you?", "s-age");
    const sys = captured[0].systemInstruction ?? "";
    expect(sys).toContain("2003-06-18");
    expect(sys).toMatch(/you are 23 years old/);
    // First-person identity rules are present.
    expect(sys).toContain("You ARE Leo Joseph Perumpully");
  });

  it("records the failed turn never — retried identity violations don't leak", async () => {
    // First Gemini reply violates identity; the retry is clean.
    replyQueue.push("Leo was born on June 18, 2003."); // violation
    replyQueue.push("I was born on June 18, 2003, so I'm 23."); // corrected
    const { reply } = await replyOf("How old is Leo?", "s-guard");
    expect(reply).toBe("I was born on June 18, 2003, so I'm 23.");
    expect(captured.length).toBe(2);
    expect(captured[1].systemInstruction).toContain("CRITICAL CORRECTION");
  });

  it("sends conversation history for follow-up resolution", async () => {
    replyQueue.push("I work at Al-Nassim Golden Group.");
    await replyOf("Where do you work?", "s-fu");
    replyQueue.push("It's going well — lots of full-stack work.");
    await replyOf("How is the company?", "s-fu");
    const second = captured[captured.length - 1];
    expect(second.history?.some((t) => t.text.includes("Al-Nassim"))).toBe(true);
    // Follow-up context retrieval still resolves the employer deterministically.
    expect(second.systemInstruction).toContain("Al-Nassim Golden Group");
  });

  it("keeps sessions isolated — history never crosses sessions", async () => {
    replyQueue.push("I studied at Karunya.");
    await replyOf("Where did you study?", "s-a");
    replyQueue.push("Generic answer.");
    await replyOf("What is your favourite colour?", "s-b");
    const second = captured[captured.length - 1];
    expect(second.history?.some((t) => t.text.includes("Karunya")) ?? false).toBe(false);
  });

  it("does not leak internal implementation details in replies", async () => {
    replyQueue.push("Here is my background.");
    const { reply } = await replyOf("Who are you?", "s-leak");
    expect(reply).not.toMatch(/\{"|VERIFIED PROFILE FACTS|retrieval score/i);
  });

  it("returns the empty-message greeting without calling Gemini", async () => {
    const res = await post("", "s-empty");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.reply).toContain("Leo Joseph");
    expect(captured.length).toBe(0);
  });

  it("conversation history cap: never sends an unbounded history", async () => {
    for (let i = 0; i < 20; i++) {
      replyQueue.push(`Turn ${i}.`);
      await replyOf(`Question ${i}?`, "s-cap");
    }
    // HISTORY_WINDOW is 12.
    const last = captured[captured.length - 1];
    expect((last.history ?? []).length).toBeLessThanOrEqual(12);
  });
});
