"use client";

import { useState } from "react";
import type { AskResponse, Citation } from "@/lib/types";

const EXAMPLES = [
  "หนอนชอนใบส้มชื่อวิทยาศาสตร์อะไร",
  "สารป้องกันกำจัดแมลงกลุ่มไหนใช้กับเพลี้ยไฟในมะม่วงได้",
  "ต้องเว้นระยะเก็บเกี่ยวหลังพ่นสารกี่วัน",
];

type View =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "answer"; question: string; data: AskResponse }
  | { kind: "error"; question: string; message: string };

function AnswerText({ text }: { text: string }) {
  // The model writes [n]; link each marker to its source card below.
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="answer-text">
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        return m ? (
          <a key={i} className="cite-mark" href={`#source-${m[1]}`}>
            {m[1]}
          </a>
        ) : (
          part
        );
      })}
    </p>
  );
}

function SourceCard({ c }: { c: Citation }) {
  return (
    <li id={`source-${c.number}`} className="source">
      <span className="source-num">{c.number}</span>
      <div>
        <div className="source-title">{c.title_th}</div>
        <div className="source-meta">
          <span className="badge">ฉบับ พ.ศ. {c.edition_year_be}</span>
          <span>หน้า {c.page_number ?? "ไม่ระบุ"}</span>
          {c.section && <span>{c.section}</span>}
        </div>
      </div>
    </li>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const busy = view.kind === "loading";

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setView({ kind: "loading", question: text });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setView({
          kind: "error",
          question: text,
          message: body?.error ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
        });
        return;
      }
      setView({ kind: "answer", question: text, data: body as AskResponse });
    } catch {
      setView({
        kind: "error",
        question: text,
        message: "เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
      });
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <h1>ถามคู่มือสารเคมีเกษตร</h1>
        <p>
          ตอบจากคู่มือคำแนะนำการใช้สารป้องกันกำจัดศัตรูพืชของกรมวิชาการเกษตร
          ใช้เฉพาะฉบับล่าสุด และอ้างอิงเอกสาร ฉบับ และหน้าทุกครั้ง
        </p>
      </header>

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="q" className="sr-only">
          คำถาม
        </label>
        <textarea
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void ask(question);
            }
          }}
          maxLength={500}
          rows={3}
          placeholder="พิมพ์คำถาม เช่น สารชนิดนี้ใช้กับพืชอะไรได้บ้าง"
        />
        <div className="ask-row">
          <span className="hint">{question.length}/500 · Ctrl+Enter เพื่อส่ง</span>
          <button type="submit" disabled={busy || question.trim().length === 0}>
            {busy ? "กำลังค้นหา…" : "ถาม"}
          </button>
        </div>
      </form>

      {view.kind === "idle" && (
        <section className="examples" aria-label="ตัวอย่างคำถาม">
          <h2>ลองถามดู</h2>
          <div className="chips">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="chip"
                onClick={() => {
                  setQuestion(ex);
                  void ask(ex);
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-live="polite" className="result">
        {view.kind === "loading" && (
          <div className="card muted">
            กำลังค้นหาในคู่มือและตรวจสอบคำตอบ อาจใช้เวลาสักครู่…
          </div>
        )}

        {view.kind === "error" && <div className="card error">{view.message}</div>}

        {view.kind === "answer" && view.data.citations.length > 0 && (
          <div className="card">
            <h2>คำตอบ</h2>
            <AnswerText text={view.data.answer} />
            <h3>แหล่งอ้างอิง</h3>
            <ol className="sources">
              {view.data.citations.map((c) => (
                <SourceCard key={c.number} c={c} />
              ))}
            </ol>
          </div>
        )}

        {view.kind === "answer" && view.data.citations.length === 0 && (
          // Refusal is a correct outcome, not a failure: show it as one.
          <div className="card refusal">
            <h2>ไม่พบคำตอบในคู่มือ</h2>
            <p>{view.data.answer}</p>
            <p className="muted">
              ระบบจะไม่เดาเมื่อไม่มีข้อมูลรองรับ ลองถามให้เจาะจงขึ้น
              หรือใช้ชื่อสารหรือชื่อศัตรูพืชตามที่ระบุในคู่มือ
            </p>
          </div>
        )}
      </section>

      <footer className="foot">
        ข้อมูลจากคู่มือฉบับ พ.ศ. 2565, 2566 และ 2568 ระบบแสดงเฉพาะแนวทางของฉบับที่ยังใช้อยู่
        โปรดตรวจสอบกับเอกสารต้นฉบับก่อนนำไปใช้จริง
      </footer>
    </main>
  );
}
