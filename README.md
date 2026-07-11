# Conversation Insights

**Voice call analytics platform** for AI agents — sentiment, booking rates, keyword trends, ingestion pipelines, and optional LLM-powered analysis. Full-stack app with a FastAPI backend, SQLite persistence, and a React dashboard.

## Highlights

- Call explorer with search and filters (agent, sentiment, outcome)
- Dashboard KPIs: booking rate, sentiment averages, volume trends
- Per-agent performance views
- Transcript analysis (rules engine + optional Groq LLM)
- **Call ingestion API** with API-key auth and webhook support
- **SQLite database** with WAL mode, seed migration from JSON fixtures
- **Rate limiting** on analyze and ingest endpoints (slowapi)
- Integrations dashboard for pipeline status and live ingest testing
- Simulated async job queue with progress tracking

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
| `INGEST_API_KEY` | Key for `POST /ingest/call` (`X-API-Key` header) |
| `WEBHOOK_SECRET` | Optional secret for webhook ingest |
| `GROQ_API_KEY` | Optional — enables LLM transcript analysis |
| `ENABLE_LLM_ANALYSIS` | `true`/`false` — use Groq when key is set |
| `RATE_LIMIT_DEFAULT` | Default rate limit (e.g. `100/minute`) |

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Service health, DB stats, integration status |
| `GET /api/v1/calls` | List and filter calls |
| `GET /api/v1/analytics/dashboard` | Dashboard metrics |
| `POST /api/v1/analyze` | Analyze a transcript (rate limited) |
| `POST /api/v1/ingest/call` | Ingest call via API key |
| `POST /api/v1/ingest/webhook` | Webhook ingest (optional secret) |
| `GET /api/v1/ingest/events` | Recent ingestion audit log |
| `GET /api/v1/integrations/status` | Groq, webhook, DB status |
| `GET /api/v1/jobs` | Background job status |
| `POST /api/v1/jobs` | Enqueue a job |

## Architecture

```
Frontend (React) → API routes → Services → Repositories → SQLite
                                    ↓
                              LLM client (Groq)
                              Ingestion pipeline
```

Routes stay thin; business logic lives in services (analytics, analysis, ingestion, jobs). Repositories abstract SQLite persistence with JSON seed migration on first boot.

## License

MIT
