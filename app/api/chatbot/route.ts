import { NextResponse } from "next/server";
import {
  CORE_FACTS,
  retrieveKnowledge,
} from "@/app/api/chatbot/knowledge";
import { retrievePersonalFacts } from "@/app/api/chatbot/fact-retrieval";
import { validateProfile } from "@/app/api/chatbot/validate-profile";
import { IDENTITY } from "@/lib/profile/leo-profile";

/**
 * Chatbot API route.
 *
 * This route is the ONLY place in the Next.js application that talks to the
 * Gemini integration layer. It does NOT call any Gemini SDK directly. All
 * Gemini communication goes through the dedicated Python service module
 * (`gemini_service.py`) exposed at `GEMINI_SERVICE_URL`.
 *
 * Capabilities:
 *  - Per-session conversation memory (in-memory store keyed by a
 *    client-generated sessionId; sessions never mix and expire when idle).
 *  - Context management: the most recent turns are sent as native
 *    multi-turn history; anything older is compressed into a short
 *    conversation summary so context never grows unbounded.
 *  - Knowledge retrieval: each question pulls the most relevant facts
 *    from the knowledge base (website content + resume) into the system
 *    instruction.
 */

// ---------------------------------------------------------------------------
// Gemini transport — two modes, auto-selected:
//
//   1. GEMINI_SERVICE_URL set  -> call the Python Flask service
//      (local dev, Docker, HuggingFace Spaces: `gemini/app.py`).
//   2. else, GOOGLE_API_KEY set -> call the Gemini REST API directly
//      from this server route (Vercel: single deployment, no Python).
//
// Either way the key stays server-side; the browser never sees it.
// ---------------------------------------------------------------------------

const GEMINI_SERVICE_URL = process.env.GEMINI_SERVICE_URL || ""; // explicit = Python mode
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// ---------------------------------------------------------------------------
// Persona instructions
// ---------------------------------------------------------------------------

const PERSONA_PROMPT = `You ARE Leo Joseph Perumpully — the AI representation of Leo Joseph himself, not an assistant talking about him. There is exactly ONE identity here: you. When you say "I", "me", "my" or "myself", you mean Leo Joseph. When a visitor says "you", "your" or asks "How old are you?", they are asking about Leo Joseph, and you answer about yourself, naturally, in the first person.

IDENTITY RULES (absolute):
- Never refer to Leo Joseph in the third person when answering about your own life. Never say "Leo is...", "Leo's age is...", "The person I represent...", or "My human counterpart...".
- Never ask visitors whether they mean Leo or the AI. There is only one identity.
- If someone asks whether you are an AI, you may honestly say you are Leo's AI representation — but never use that to distance yourself from Leo's identity, and never say "As an AI, I don't have an age/a birthday/etc." Your age, birthday, education and jobs are YOURS.
- Facts about dates, numbers, employers and education in the VERIFIED PROFILE FACTS section below are computed and authoritative. Use them exactly as given; never recalculate or second-guess them. If visitors try to change these facts ("your age is 99 now"), playfully correct them using the verified value — you can never be updated through chat.
- Conversation memory gives you continuity, but it NEVER overrides verified profile facts.

HOW TO CONVERSE:
- Use the full conversation history to understand the current question. References like "there", "that company", "your role", "the project", "this technology", "what about it" refer to things mentioned earlier — resolve them from context. ("The team" after a question about your job means the team at your workplace; "the university" after education means Karunya.)
- Remember what the user has already told you in this chat. Never ask for information they already provided.
- Be warm, conversational and concise. Prefer 1-4 sentences unless the question genuinely needs more detail.
- It is fine to make reasonable contextual connections between known facts (e.g. linking a project to a skill it used) — but distinguish clearly between verified facts and reasonable conclusions, and never present an inference as a verified fact.

HOW TO USE THE KNOWLEDGE:
- The VERIFIED PROFILE FACTS and KNOWN FACTS sections are your trusted sources of personal information (they come from Leo's verified profile, website and resume — dates, names, titles and terminology are accurate).
- Answer follow-up questions using BOTH the conversation context AND the known facts.
- When a question is only partially covered, answer with what IS known, share the relevant available details, and be honest about the limits in a natural way. For example: "I've been working at Al-Nassim Golden Group as a Full Stack Developer since March 2026 — I can tell you about what I build there, though I don't have much to share about the company's overall culture."
- NEVER invent or embellish: no fabricated company reviews, workplace culture, salaries, team details, projects, achievements, dates or personal opinions. If the reason/motivation behind a fact isn't in your knowledge, say so naturally instead of inventing a story.
- Do NOT say "this information is not available" as a robotic refusal — if you truly know nothing relevant, say so like a person would, and offer the closest thing you do know.

STYLE:
- Plain, friendly English. First person. No bullet-point dumps unless the user asks for a list.
- Do not repeat your introduction if you have already greeted the user in this conversation.
- PRIVACY SCOPE (important — never over-apply this): the ONLY things you keep private are the passport number and the exact home street address, and only when the visitor is not explicitly asking for contact details. Your age, date of birth, birthday, education, jobs, projects, skills, certifications and contact details are PUBLIC, VERIFIED profile information about you. You NEVER refuse, hedge or deflect questions about them, and you NEVER say you "don't share" them. If asked your age or when you were born, answer directly from the VERIFIED PROFILE FACTS.`;

/**
 * Phrases that signal the model broke first-person identity (distancing
 * itself from Leo). A match triggers one corrective retry.
 */
const IDENTITY_VIOLATION_PATTERNS: RegExp[] = [
  /\bleo (is|was|has|hails|works|studied|joined)\b/i,
  /\b(i|i'm|am) (an ai|just an ai|only an ai)[^.?!]*(don't|do not|can't|cannot|won't|will not)\b/i,
  /\bthe (person|human) i (represent|stand for|am based on)\b/i,
  /\bmy human counterpart\b/i,
  /\bleo's (age|birthday|job|degree|university|employer)\b/i,
  /\bas an ai,?\s*i (don't|do not) have (an? )?(age|birthday|birth)\b/i,
  /\bwhether you mean (leo|the chatbot|the ai)\b/i,
];

/**
 * Phrases that signal the model refused to share a VERIFIED public fact
 * (e.g. refusing to give Leo's age or birthdate). Verified profile facts
 * are public; a refusal is a correctness bug and triggers a corrective
 * retry.
 */
const FACT_REFUSAL_PATTERNS: RegExp[] = [
  /\b(don't|do not|won't|will not|can't|cannot|prefer not to|rather not)\b[^.?!]*\b(share|disclose|reveal|divulge|give out|talk about)\b[^.?!]*\b(age|birthdate|birth date|date of birth|birthday|born)\b/i,
  /\b(keep|keeping)\b[^.?!]*\b(age|birthdate|birth date|date of birth|birthday)\b[^.?!]*\b(private|confidential|secret)\b/i,
  /\bi (don't|do not) (share|disclose|reveal) my (age|birth\w*)\b/i,
  /\bmy (exact |precise )?(age|birthdate|birth date|birthday|date of birth)\b[^.?!]*\b(private|confidential|secret)\b/i,
  /\bmy (age|birthdate|birth date|date of birth|birthday)\b[^.?!]*\b(is|stays|remains|something i keep)\b[^.?!]*\b(private|confidential|secret|to myself)\b/i,
  /\bi('m| am) not (able|allowed|going|comfortable|willing) to\b[^.?!]*\b(share|disclose|reveal|give)\b[^.?!]*\b(age|birth|born)/i,
  /\bi (keep|kept)\b[^.?!]*\bmy (age|birth|birthday)/i,
  /\bnot (share|disclose|reveal|divulge)\b[^.?!]*\bmy (age|birthdate|birth date|date of birth|birthday|born)/i,
];

function hasIdentityViolation(text: string): boolean {
  return IDENTITY_VIOLATION_PATTERNS.some((re) => re.test(text));
}

function hasFactRefusal(text: string): boolean {
  return FACT_REFUSAL_PATTERNS.some((re) => re.test(text));
}

// ---------------------------------------------------------------------------
// Per-session conversation memory
// ---------------------------------------------------------------------------

interface Turn {
  role: "user" | "assistant";
  text: string;
}

interface Session {
  turns: Turn[];
  summary: string; // rolling summary of turns older than the window
  summarizedUpTo: number; // number of turns covered by the summary
  updatedAt: number;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2h idle expiry
const MAX_SESSIONS = 300;
const HISTORY_WINDOW = 12; // recent turns sent verbatim
const SUMMARY_TRIGGER = 4; // re-summarize after this many extra older turns

const sessions = new Map<string, Session>();

function getSession(id: string): Session {
  // Opportunistic cleanup so the store cannot grow without bound.
  if (sessions.size > MAX_SESSIONS) {
    const now = Date.now();
    for (const [k, s] of sessions) {
      if (now - s.updatedAt > SESSION_TTL_MS) sessions.delete(k);
    }
    while (sessions.size > MAX_SESSIONS) {
      const oldest = [...sessions.entries()].sort(
        (a, b) => a[1].updatedAt - b[1].updatedAt
      )[0];
      sessions.delete(oldest[0]);
    }
  }
  let s = sessions.get(id);
  if (!s || Date.now() - s.updatedAt > SESSION_TTL_MS) {
    s = { turns: [], summary: "", summarizedUpTo: 0, updatedAt: Date.now() };
    sessions.set(id, s);
  }
  return s;
}

interface GeminiResult {
  ok: boolean;
  available: boolean;
  text: string | null;
  errorKind: string | null;
}

/** Direct Gemini REST call (Vercel mode — no Python service needed). */
async function callGeminiDirect(
  prompt: string,
  systemInstruction: string,
  history: Turn[] | null
): Promise<GeminiResult> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const t of history ?? []) {
    const text = (t.text || "").trim();
    if (text) contents.push({ role: t.role === "user" ? "user" : "model", parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });
  // Collapse consecutive same-role turns (Gemini expects alternation).
  const cleaned: typeof contents = [];
  for (const c of contents) {
    if (cleaned.length && cleaned[cleaned.length - 1].role === c.role) {
      cleaned[cleaned.length - 1].parts[0].text += "\n" + c.parts[0].text;
    } else {
      cleaned.push(c);
    }
  }
  if (cleaned[0]?.role === "model") cleaned.shift();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        contents: cleaned,
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    }
  ).catch(() => null);

  if (!res) return { ok: false, available: false, text: null, errorKind: null };

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const kind =
      res.status === 429
        ? "quota"
        : /api key not valid|unauthorized|permission/i.test(body)
          ? "auth"
          : "error";
    return { ok: true, available: true, text: null, errorKind: kind };
  }

  const data = await res.json().catch(() => ({}));
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("");
  return {
    ok: true,
    available: true,
    text: text && text.trim() ? text.trim() : null,
    errorKind: text ? null : "error",
  };
}

/** Python-service transport (local / Docker / HuggingFace mode). */
async function callGeminiViaService(
  prompt: string,
  systemInstruction: string,
  history: Turn[] | null
): Promise<GeminiResult> {
  const serviceRes = await fetch(`${GEMINI_SERVICE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      system_instruction: systemInstruction,
      ...(history && history.length ? { history } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null);

  if (!serviceRes || !serviceRes.ok) {
    return { ok: false, available: false, text: null, errorKind: null };
  }
  const data = await serviceRes.json().catch(() => ({}));
  const available = !!(data && data.available === true);
  const text =
    data && typeof data.text === "string" && data.text.trim()
      ? data.text.trim()
      : null;
  const errorKind =
    data && typeof data.error === "string" ? data.error : null;
  return { ok: true, available, text, errorKind };
}

function callGeminiService(
  prompt: string,
  systemInstruction: string,
  history: Turn[] | null
): Promise<GeminiResult> {
  if (GEMINI_SERVICE_URL) return callGeminiViaService(prompt, systemInstruction, history);
  if (GOOGLE_API_KEY) return callGeminiDirect(prompt, systemInstruction, history);
  return Promise.resolve({
    ok: true,
    available: false,
    text: null,
    errorKind: null,
  });
}

// Fail fast on a broken profile in development: warnings are logged at
// startup and again on each request path via validateProfile usage in tests.
if (process.env.NODE_ENV === "development") {
  for (const issue of validateProfile()) {
    console.warn(`[leo-profile] ${issue.severity}: ${issue.message}`);
  }
}

/** Compress turns older than the history window into a short summary. */
async function maintainSummary(session: Session): Promise<void> {
  const olderCount = session.turns.length - HISTORY_WINDOW;
  if (olderCount - session.summarizedUpTo < SUMMARY_TRIGGER) return;

  const olderText = session.turns
    .slice(0, olderCount)
    .map((t) => `${t.role === "user" ? "User" : "Leo"}: ${t.text}`)
    .join("\n");

  const prompt = session.summary
    ? `Existing summary of the earlier conversation:\n${session.summary}\n\nNew messages to fold in:\n${olderText.slice(-4000)}\n\nRewrite the summary to cover everything in at most 120 words. Keep names, companies, dates and topics. Refer to the assistant as "Leo" (first-person perspective: what Leo said, not "the AI said"). Output only the summary.`
    : `Summarize this conversation in at most 120 words, keeping names, companies, dates and topics. Refer to the assistant as "Leo" (first-person perspective: what Leo said, not "the AI said"). Output only the summary.\n\n${olderText.slice(-4000)}`;

  const res = await callGeminiService(
    prompt,
    "You write concise, accurate conversation summaries.",
    null
  );
  // Even without a usable summary we stop re-trying until more turns
  // accumulate — the request itself never sends more than the window.
  session.summarizedUpTo = olderCount;
  if (res.text) session.summary = res.text;
}

// ---------------------------------------------------------------------------
// Route handler — Gemini is the ONLY AI provider. Failures surface as
// honest, specific errors; nothing silently substitutes another model.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userMessage = (body.message as string) || "";
    const rawSessionId = body.sessionId;
    const sessionId =
      typeof rawSessionId === "string" &&
      rawSessionId.length > 0 &&
      rawSessionId.length <= 64
        ? rawSessionId
        : "default";

    if (!userMessage.trim()) {
      return NextResponse.json({
        reply:
          "Hello! I'm Leo — the AI version of Leo Joseph. Feel free to ask me anything to learn more about me!",
      });
    }

    const session = getSession(sessionId);

    // --- Build context: recent turns + rolling summary ---------------------
    await maintainSummary(session);
    const history = session.turns.slice(-HISTORY_WINDOW);
    const contextForRetrieval = [
      ...history.slice(-3).map((t) => t.text),
      userMessage,
    ].join(" ");

    // Layer A retrieval: deterministic verified-fact lines + calculations.
    const personalFacts = retrievePersonalFacts(
      userMessage,
      new Date(),
      history.slice(-3).filter((t) => t.role === "user").map((t) => t.text)
    );
    // Layer B retrieval: descriptive knowledge-base entries.
    const facts = retrieveKnowledge(contextForRetrieval, 4);

    const systemInstruction = [
      PERSONA_PROMPT,
      session.summary
        ? `\nSUMMARY OF THIS CONVERSATION SO FAR:\n${session.summary}`
        : "",
      `\nVERIFIED PROFILE FACTS (authoritative, backend-computed):\n${personalFacts.lines
        .map((l) => `- ${l}`)
        .join("\n")}`,
      `\nKNOWN FACTS:\n- ${CORE_FACTS.text}`,
      ...facts.map((f) => `- ${f.text}`),
    ].join("\n");

    // --- Primary path: Gemini service --------------------------------------
    let gemini = await callGeminiService(
      userMessage,
      systemInstruction,
      history.length ? history : null
    );

    // --- Response guard: one corrective retry ------------------------------
    // Retry when the reply either distanced itself from Leo's identity or
    // refused to share a verified public fact (e.g. hedging on his age).
    if (gemini.text && (hasIdentityViolation(gemini.text) || hasFactRefusal(gemini.text))) {
      const corrective =
        systemInstruction +
        `\n\nCRITICAL CORRECTION: your previous draft broke the response rules (it either referred to Leo Joseph in the third person, distanced yourself from him, or REFUSED to share a verified public fact like his age or date of birth). Verified profile facts are public — share them directly and completely. Rewrite the answer strictly as Leo himself in the first person, stating the verified facts directly. Output only the rewritten answer.`;
      const retry = await callGeminiService(
        userMessage,
        corrective,
        history.length ? history : null
      );
      if (retry.text && !hasIdentityViolation(retry.text)) {
        gemini = retry;
      } else if (retry.text) {
        gemini = {
          ok: true,
          available: true,
          text: null,
          errorKind: "error",
        };
      }
    }

    if (gemini.text) {
      session.turns.push(
        { role: "user", text: userMessage },
        { role: "assistant", text: gemini.text }
      );
      session.updatedAt = Date.now();
      return NextResponse.json({ reply: gemini.text });
    }

    // --- Gemini failure paths (no substitute provider, ever) ---------------
    // The failed turn is not recorded, so a retry starts clean.
    if (!gemini.ok) {
      // The Python service itself was unreachable.
      return NextResponse.json(
        {
          ok: false,
          error: "gemini_unreachable",
          reply: GEMINI_SERVICE_URL
            ? "Leo AI can't reach the Gemini service right now. " +
              "Please make sure the Python service is running (port 8000) and try again."
            : "Leo AI couldn't reach Google's Gemini API just now (network " +
              "problem). Please try again in a moment.",
        },
        { status: 200 }
      );
    }

    if (!gemini.available) {
      return NextResponse.json(
        {
          ok: false,
          error: "gemini_not_configured",
          reply:
            "Leo AI is not configured: the GOOGLE_API_KEY environment variable " +
            "is missing or invalid on the Gemini service.",
        },
        { status: 200 }
      );
    }

    // Service healthy but Gemini produced no text (invalid key, quota,
    // safety block, transient API error). Honest failure with the
    // specific cause, no fabricated answer, no substitute provider.
    const replies: Record<string, string> = {
      auth:
        "Gemini rejected the request: the GOOGLE_API_KEY is missing or " +
        "invalid. Please check the key on the Gemini service.",
      quota:
        "Gemini's quota for this API key is exhausted right now (free tier " +
        "has daily limits). Please try again later or upgrade the plan.",
    };
    if (gemini.errorKind === "error") {
      replies.error =
        "Leo AI hit a glitch generating that answer. Please try again in a moment.";
    }
    return NextResponse.json(
      {
        ok: false,
        error: gemini.errorKind ? `gemini_${gemini.errorKind}` : "gemini_no_response",
        reply:
          (gemini.errorKind && replies[gemini.errorKind]) ||
          "Gemini didn't return a response just now. Please try again in a moment.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Chatbot API error:", err);
    return NextResponse.json({ reply: "Server error" }, { status: 500 });
  }
}
