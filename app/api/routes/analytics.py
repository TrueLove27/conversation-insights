from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import AgentMetrics, DashboardMetrics
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])
service = AnalyticsService()


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard(
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
) -> DashboardMetrics:
    return service.get_dashboard_metrics(from_date=from_date, to_date=to_date)


@router.get("/agents/{agent_id}", response_model=AgentMetrics)
def get_agent_metrics(agent_id: str) -> AgentMetrics:
    metrics = service.get_agent_metrics(agent_id)
    if not metrics:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return metrics
