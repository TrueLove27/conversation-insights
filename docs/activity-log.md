# Activity Log

Portfolio maintenance notes.


- **2026-06-12** - log June maintenance pass on call filters
- **2026-06-24** - update ingestion checklist log
- **2026-07-05** - record dashboard KPI validation
- **2026-07-19** - Plan 1 foundation: SQL call filtering/pagination, request-ID logging, RagClient connection reuse, RAG degraded surfacing on analyze, health RAG probe, JsonStore removal, expanded .env.example
- **2026-07-19** - Plan 2 AI + security: shared API-key auth for sync/import/events, typed/rate-limited knowledge routes, unified analyze orchestrator, background RAG sync after ingest/import, Settings API-key UI
- **2026-07-19** - Plan 3 frontend polish: Jobs nav, live sidebar health from /health, mobile drawer shell, ErrorBoundary, coach offline banners, Calls agent names, useAsyncLoad on Calls/Jobs
- **2026-07-19** - Plan 4 SQL analytics: dashboard aggregations in SQLite, outcome/sentiment indexes, from_date/to_date filters, Overview 7d/30d/All presets
- **2026-07-19** - Plan 5 real jobs: batch/keyword/agent_report use live data; POST /jobs requires API key; webhook fail-closed without secret; default key startup warning
- **2026-07-19** - Plan 6 rule engine + CI: word-boundary phrase hits, tighter booking intent, prefix keyword categories, golden analysis tests, ruff/mypy in backend CI
- **2026-07-19** - Plan 7 async cleanup: AbortController in useAsyncLoad, lean CallSummary agent metrics, typed knowledge responses, remove dead list_calls/integrations analyze, IngestionEvent type sync
- **2026-07-19** - Impact Plan A: All Calls transcript detail renders as Agent/Customer chat bubbles instead of raw pre text
- **2026-07-19** - Impact Plan B: deep links — `/calls/:id`, `/agents/:id`; Overview leaderboard and agent recent calls navigate to detail
- **2026-07-19** - Impact Plan C: Add your own call form on All Calls — paste transcript, ingest+analyze, jump to new call
- **2026-07-19** - Impact Plan D: Review a Call shows mood breakdown bars, risk flags, and keyword chips
- **2026-07-19** - Impact Plan E: Copy buttons on coaching advice / scripts with Copied! toast
- **2026-07-19** - Impact Plan F: Jobs detail shows human-readable reports instead of raw JSON payloads
- **2026-07-19** - Impact Plan G: All Calls pagination (Load more), 7d/30d date filters, search highlight in transcript
- **2026-07-19** - Impact Plan H: Agents page outcome bar chart + recommended playbook cards on digest
- **2026-07-19** - Impact Plan I: All Calls “Get coaching tips” deep-links to Coaching Tips with pre-filled question
- **2026-07-19** - Impact Plan J: All Calls download (.txt) and print call summary export
