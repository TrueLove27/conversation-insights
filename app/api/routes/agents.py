from fastapi import APIRouter, HTTPException

from app.models.schemas import AgentRecord
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/agents", tags=["agents"])
service = AnalyticsService()


@router.get("", response_model=list[AgentRecord])
def list_agents() -> list[AgentRecord]:
    return service.list_agents()


@router.get("/{agent_id}", response_model=AgentRecord)
def get_agent(agent_id: str) -> AgentRecord:
    agent = service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return agent
