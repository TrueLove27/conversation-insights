# Conversation Insights

**Voice call analytics platform** for AI agents — sentiment, booking rates, keyword trends, and background job processing. Full-stack app with a FastAPI backend and React dashboard.

## Highlights

- Call explorer with search and filters (agent, sentiment, outcome)
- Dashboard KPIs: booking rate, sentiment averages, volume trends
- Per-agent performance views
- Transcript analysis (sentiment, keywords, booking intent)
- Simulated async job queue with progress tracking

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, Pydantic |
| Frontend | React, TypeScript, Vite, Recharts |
| Persistence | JSON-backed store |

## Getting started

**With Docker**

```bash
docker compose up --build
```

- App: http://localhost:8080  
- API docs: http://localhost:8000/docs  

**Local development**

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```

Frontend dev server: http://localhost:5173

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/calls` | List and filter calls |
| `GET /api/v1/analytics/dashboard` | Dashboard metrics |
| `POST /api/v1/analyze` | Analyze a transcript |
| `GET /api/v1/jobs` | Background job status |
| `POST /api/v1/jobs` | Enqueue a job |

## Architecture

Routes stay thin; business logic lives in services (analytics, analysis, jobs). Repositories abstract file-based persistence.

## License

MIT
