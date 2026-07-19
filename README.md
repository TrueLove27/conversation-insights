# Talksmith (Conversation Insights)

**Craft better conversations** — a voice call coaching platform for support and sales teams. Review calls, spot patterns, get AI coaching tips, and find similar conversations. Full-stack app with FastAPI, SQLite, React, and optional RAG-powered analysis.

![Backend API](https://github.com/TrueLove27/conversation-insights/actions/workflows/backend-ci.yml/badge.svg)
![Frontend Dashboard](https://github.com/TrueLove27/conversation-insights/actions/workflows/frontend-ci.yml/badge.svg)
![Docker Images](https://github.com/TrueLove27/conversation-insights/actions/workflows/docker-ci.yml/badge.svg)
![Release Check](https://github.com/TrueLove27/conversation-insights/actions/workflows/release-check.yml/badge.svg)

## Highlights

- Call explorer with search and filters (agent, sentiment, outcome)
- Dashboard KPIs via SQL aggregations (booking rate, sentiment, volume trends) with 7d/30d/All date presets
- Per-agent performance views
- Transcript analysis (rules engine + optional Groq LLM + RAG context)
- **Coaching Tips** and **Find Similar** powered by rag-service
- **Call library import** from call-corpus-service (600+ calls)
- **Call ingestion API** with API-key auth and webhook support; admin ops (sync/import/events) require `X-API-Key`
- Background RAG re-sync after ingest/import (`RAG_SYNC_ON_INGEST`)
- **SQLite database** with WAL mode, seed migration from JSON fixtures
- **Rate limiting** on analyze, ingest, and knowledge endpoints (slowapi)
- Integrations dashboard for pipeline status; Settings UI stores admin API key
- Background job queue runs real batch/keyword/agent analysis (Background Jobs nav; `POST /jobs` requires API key)

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, Pydantic, SQLite, httpx, slowapi |
| Frontend | React, TypeScript, Vite, Recharts |
| Integrations | Groq LLM (optional), webhook + REST ingest |
| Persistence | SQLite (`data/conversation_insights.db`) |

## Getting started

**With Docker**

```bash
docker compose up --build
```

- App: http://localhost:8080  
- API docs: http://localhost:8000/docs  

**Local development**

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```

Frontend dev server: http://localhost:5173

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_PATH` | SQLite file path (default: `data/conversation_insights.db`) |
| `INGEST_API_KEY` | Key for ingest + admin knowledge ops (`X-API-Key` header) |
| `WEBHOOK_SECRET` | Required for `POST /ingest/webhook` (requests rejected if unset) |
| `GROQ_API_KEY` | Optional — enables LLM transcript analysis |
| `ENABLE_LLM_ANALYSIS` | `true`/`false` — use Groq when key is set |
| `RAG_SERVICE_URL` | rag-service base URL (default `http://localhost:8002`) |
| `CORPUS_SERVICE_URL` | call-corpus-service URL (default `http://localhost:8004`) |
| `ENABLE_RAG_CONTEXT` | Include RAG context in `/analyze` when available |
| `RAG_SYNC_ON_INGEST` | Schedule background RAG `sync_all` after ingest/import |
| `RATE_LIMIT_DEFAULT` | Default rate limit (e.g. `120/minute`) |

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Service health, DB stats, integration status |
| `GET /api/v1/calls` | List and filter calls |
| `GET /api/v1/analytics/dashboard` | Dashboard metrics (optional `from_date` / `to_date`; SQL aggregates) |
| `POST /api/v1/analyze` | Analyze a transcript (rate limited) |
| `POST /api/v1/ingest/call` | Ingest call via API key |
| `POST /api/v1/ingest/webhook` | Webhook ingest (requires configured `WEBHOOK_SECRET`) |
| `GET /api/v1/ingest/events` | Recent ingestion audit log (API key) |
| `POST /api/v1/knowledge/sync-rag` | Rebuild coaching index (API key) |
| `POST /api/v1/knowledge/import-corpus` | Import sample calls (API key) |
| `GET /api/v1/integrations/status` | Groq, webhook, RAG, corpus, DB status |
| `GET /api/v1/jobs` | Background job status |
| `POST /api/v1/jobs` | Enqueue a job (API key; real batch/keyword/agent handlers) |

## Architecture

```
Frontend (React) → API routes → Services → Repositories → SQLite
                                    ↓
                              LLM client (Groq)
                              Ingestion pipeline
```

Routes stay thin; business logic lives in services (analytics, analysis, ingestion, jobs). Call list filtering and dashboard KPIs run as SQL aggregations (no full-transcript Python scans). Repositories abstract SQLite persistence with JSON seed migration on first boot.

## CI / GitHub Actions

| Workflow | What it checks |
|----------|----------------|
| **Backend API** | Python 3.12 install, import check, pytest smoke tests |
| **Frontend Dashboard** | `npm ci` + TypeScript build |
| **Docker Images** | Backend and frontend image builds |
| **Release Check** | Full-stack verification on every push to `main` |

All workflows support manual runs via **Actions → workflow → Run workflow**.

## License

MIT
