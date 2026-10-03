import { checkRate } from "@/lib/rate-limit";
import type { AskResponse } from "@/lib/types";

const MAX_QUESTION_CHARS = 500;
// Typical answer is 15-30 s (answer model, then a judge call, retried once on
// a failed check). 60 s cut off real answers; the platform limit has to be at
// least as long as the fetch timeout or the platform kills us first.
const BACKEND_TIMEOUT_MS = 90_000;
export const maxDuration = 100;

function fail(status: number, message: string, headers?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers });
}

export async function POST(request: Request) {
  const apiUrl = process.env.RAG_API_URL;
  const apiKey = process.env.RAG_API_KEY;
  if (!apiUrl || !apiKey) {
    console.error("RAG_API_URL or RAG_API_KEY is not set");
    return fail(500, "ระบบยังตั้งค่าไม่เสร็จ");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRate(ip);
  if (!rate.ok) {
    return fail(429, "ถามถี่เกินไป กรุณารอสักครู่", {
      "Retry-After": String(rate.retryAfter),
    });
  }

  let question: unknown;
  try {
    question = ((await request.json()) as { question?: unknown }).question;
  } catch {
    return fail(400, "คำขอไม่ถูกต้อง");
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return fail(422, "กรุณาพิมพ์คำถาม");
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return fail(422, `คำถามยาวเกิน ${MAX_QUESTION_CHARS} ตัวอักษร`);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl.replace(/\/$/, "")}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    console.error("backend unreachable", err);
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return fail(504, "ระบบใช้เวลาตอบนานเกินไป ลองถามอีกครั้ง หรือถามให้สั้นและเจาะจงขึ้น");
    }
    return fail(502, "เชื่อมต่อระบบตอบคำถามไม่ได้ ลองใหม่อีกครั้ง");
  }

  if (upstream.status === 429) {
    return fail(429, "ระบบมีคนใช้งานเยอะ กรุณารอสักครู่", {
      "Retry-After": upstream.headers.get("retry-after") ?? "60",
    });
  }
  if (!upstream.ok) {
    // Never forward the backend's body: it can name internals, and a 401 here
    // means our key is wrong, which is not the visitor's business.
    console.error("backend error", upstream.status);
    return fail(502, "ระบบตอบคำถามขัดข้อง ลองใหม่อีกครั้ง");
  }

  const data = (await upstream.json()) as AskResponse;
  return Response.json(data);
}
