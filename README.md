# Conversation Insights

A FastAPI-powered **call analytics platform** that surfaces sentiment, booking rates, keywords, and agent performance from conversation data. Portfolio project with synthetic sample data — no production APIs or real call recordings.

## Features

- **Call listing & filtering** by agent and sentiment
- **Aggregate metrics** — avg duration, sentiment score, booking rate
- **Live transcript analysis** — mock NLP pipeline (rule-based, no API keys)
- **Built-in dashboard** at `http://localhost:8001`

## Tech Stack

- Python 3.11+, FastAPI, Pydantic
- Vanilla JS dashboard (served as static files)
- JSON sample dataset

## Quick Start

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Open http://localhost:8001 for the dashboard. API docs: http://localhost:8001/docs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/calls` | List calls (`?agent=&sentiment=&limit=`) |
| GET | `/api/calls/{id}` | Single call detail |
| GET | `/api/metrics/summary` | Aggregate KPIs |
| GET | `/api/agents` | Agent call counts |
| POST | `/api/analyze` | Analyze a transcript (mock) |

## Skills Demonstrated

- Voice AI analytics pipeline design
- FastAPI REST architecture
- Sentiment & conversion metric modeling
- Dashboard + API co-development

## License

MIT — portfolio use.
