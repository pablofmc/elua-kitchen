---
name: elua-hito
description: How to start, build and close an Elúa Kitchen milestone (hito M0–M6) — scope check against the Phase 1 plan, the per-milestone definition of done, the checks to run, and how to report back. Load when the user says to start, continue or finish a milestone, or asks "what's next" on Elúa.
---

# Working a milestone (hito)

Plan: `docs/plan-fase-1.html` (Spanish; it replaces the PDFs, and its §10 lists what changed). Shared with the client at https://claude.ai/artifact/5TePFC38sSDdnFUmDuuwqQ — republish after editing. Domain terms: `GLOSSARY.md`. §07 lists milestones, §02 scope and priorities, §09 the settled decisions. Project memory records progress.

## Start

1. Read the milestone in §07 and the matching MUST/SHOULD items in §02. Don't pull in later milestones or PHASE 2+ items.
2. List what's needed from the user (accounts, keys, real recipes) and ask for it up front, in one message.
3. Load the skills the work touches: `elua-calculos` for any math, `elua-marca` for any UI, `supabase` + `supabase-postgres-best-practices` for schema/auth/RLS, `vercel-react-best-practices` for React/Next code.
4. This is Next.js 16: check `node_modules/next/dist/docs/` before using an API you're unsure of.

## Definition of done (every milestone)

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass.
- The feature works on a phone-sized viewport in the real app, not just in tests.
- Every table has RLS; nothing is readable without login.
- Calculation code has tests for the golden cases in `elua-calculos`.
- No secrets in the repo; keys go in `.env.local` and Vercel env vars.

## Close

1. Tell the user, in plain Spanish-friendly English, what they can now try and where — one short list.
2. Note anything skipped or deferred and why.
3. Update project memory with the milestone status and any new decisions.
4. Commit only when the user asks.
