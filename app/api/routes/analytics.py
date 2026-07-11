from fastapi import APIRouter, HTTPException

from app.models.schemas import AgentMetrics, AgentRecord, DashboardMetrics
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])
service = AnalyticsService()


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard() -> DashboardMetrics:
    return service.get_dashboard_metrics()


@router.get("/agents/{agent_id}", response_model=AgentMetrics)
def get_agent_metrics(agent_id: str) -> AgentMetrics:
    metrics = service.get_agent_metrics(agent_id)
    if not metrics:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return metrics
