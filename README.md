# rag-for-doa-web

Front end for [rag-for-doa](https://github.com/GUYBURA/rag-for-doa): a Thai-language Q&A
system over the Department of Agriculture's pesticide guidance handbooks. Live at
https://rag-for-doa-web.vercel.app

Ask a question in Thai. The answer comes only from the current edition of the handbook and
carries its sources: document, edition year (พ.ศ.) and page. When the handbook does not
support an answer, the page says so instead of guessing.

## How it fits together

```
browser  ->  Next.js route handler  ->  Cloud Run (rag-for-doa)  ->  Cloud SQL + OpenRouter
          /api/ask  (holds the key)      POST /ask, X-API-Key
```

- `app/page.tsx` — the page: question box, example questions, answer with `[n]` markers that
  link to source cards, and a separate card for a refusal (a refusal is a correct outcome,
  not an error).
- `app/api/ask/route.ts` — the only place that talks to the backend. It validates the
  question (non-blank, at most 500 characters), applies a small per-IP limit, forwards with
  the API key, and waits up to 90 s. Backend errors are mapped to short Thai messages and the
  backend's body is never forwarded.
- `lib/rate-limit.ts` — in-memory per-IP limit (5 per minute). A courtesy limit only; the
  real limits are the backend's per-key rate limit and the spending limit at the model
  provider.

**The API key never reaches the browser.** It lives in `RAG_API_KEY`, read by the route
handler on the server. Do not rename it with a `NEXT_PUBLIC_` prefix: that would ship it to
every visitor.

## Run locally

```bash
cp .env.example .env.local     # then set RAG_API_KEY
npm install
npm run dev
```

| Variable | Purpose |
| --- | --- |
| `RAG_API_URL` | Base URL of the backend (no trailing slash) |
| `RAG_API_KEY` | One of the backend's `API_KEYS`; server-side only |

## Deploy

Pushing to `main` deploys on Vercel. Set `RAG_API_URL` and `RAG_API_KEY` in the project's
environment variables. The route sets `maxDuration = 100`, so the Vercel function limit has
to allow at least that.

Built with Next.js 16 (App Router), React 19 and Noto Sans Thai.

## Disclaimer

Answers are drawn from the handbooks and checked against them, but check the original
document before applying a chemical in the field.
