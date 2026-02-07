"""
AICA Life OS - ADK Agents FastAPI Entry Point

Serves the ADK multi-agent system via FastAPI on Cloud Run.
Uses ADK's get_fast_api_app() for standard agent endpoints,
plus a custom /api/agent/chat endpoint for frontend integration.

Endpoints:
  - /run_sse: ADK standard SSE endpoint for agent execution
  - /api/agent/chat: Custom endpoint for AICA frontend integration
  - /health: Health check for Cloud Run
  - /proactive/{agent_name}: Trigger proactive agents (Task #43)
  - /proactive/status: Get proactive agents status

Usage:
  uvicorn main_agents:app --host 0.0.0.0 --port 8081
"""

import os
import json
import asyncio
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
import jwt

load_dotenv()

# Ensure API key is set for ADK
if not os.getenv("GOOGLE_API_KEY"):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        os.environ["GOOGLE_API_KEY"] = gemini_key

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Import root agent
from agents.agent import root_agent

# Import proactive agents (Task #43)
from agents.proactive import (
    register_all_agents,
    get_scheduler,
    trigger_agent,
    trigger_agent_for_all,
    list_agents as list_proactive_agents,
)

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
PROACTIVE_TRIGGER_SECRET = os.getenv("PROACTIVE_TRIGGER_SECRET", "dev-secret-change-in-production")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://aica-staging-5p22u2w6jq-rj.a.run.app",
    "https://aica-staging-5562559893.southamerica-east1.run.app",
]

APP_NAME = "aica-agents"

# Register all proactive agents at startup
register_all_agents()

# ============================================================================
# APP SETUP
# ============================================================================

app = FastAPI(
    title="AICA Agents Service",
    description="ADK Multi-Agent System for AICA Life OS",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

security = HTTPBearer()
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)

# ============================================================================
# AUTH
# ============================================================================


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Verify Supabase JWT and return user_id."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================


class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[dict] = None


class AgentChatResponse(BaseModel):
    success: bool
    response: str
    agent: str
    session_id: str
    sources: list = []
    error: Optional[str] = None


class ProactiveTriggerRequest(BaseModel):
    user_id: str  # UUID or "all" for all users
    context: Optional[dict] = None


class ProactiveTriggerResponse(BaseModel):
    success: bool
    message: str
    agent_name: str
    data: Optional[dict] = None
    error: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "aica-agents", "agent": root_agent.name}


@app.post("/api/agent/chat", response_model=AgentChatResponse)
async def agent_chat(
    request: AgentChatRequest,
    user_id: str = Depends(verify_token),
):
    """
    Chat with the AICA coordinator agent.

    The coordinator analyzes intent and delegates to the appropriate
    module-specific agent. Returns the agent's response with metadata.
    """
    session_id = request.session_id or f"session_{user_id}"

    try:
        # Ensure session exists
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
        if session is None:
            session = await session_service.create_session(
                app_name=APP_NAME,
                user_id=user_id,
                session_id=session_id,
            )

        # Inject user context into session state
        if request.context:
            session.state.update(request.context)
        session.state["user_id"] = user_id

        # Run agent
        content = types.Content(
            role="user",
            parts=[types.Part(text=request.message)],
        )

        response_text = ""
        responding_agent = root_agent.name
        sources = []

        events = runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content,
        )

        async for event in events:
            if event.is_final_response() and event.content and event.content.parts:
                response_text = event.content.parts[0].text
                responding_agent = event.author or root_agent.name

                # Extract grounding sources if available
                if hasattr(event, "grounding_metadata") and event.grounding_metadata:
                    for chunk in getattr(
                        event.grounding_metadata, "grounding_chunks", []
                    ):
                        if hasattr(chunk, "web"):
                            sources.append(
                                {
                                    "title": getattr(chunk.web, "title", ""),
                                    "url": getattr(chunk.web, "uri", ""),
                                }
                            )

        if not response_text:
            response_text = "Desculpe, nao consegui processar sua mensagem. Tente novamente."

        return AgentChatResponse(
            success=True,
            response=response_text,
            agent=responding_agent,
            session_id=session_id,
            sources=sources,
        )

    except Exception as e:
        return AgentChatResponse(
            success=False,
            response="",
            agent=root_agent.name,
            session_id=session_id,
            error=str(e),
        )


# ============================================================================
# PROACTIVE AGENT ENDPOINTS (Task #43)
# ============================================================================


def verify_proactive_secret(
    x_proactive_secret: Optional[str] = None,
) -> bool:
    """Verify proactive trigger secret for external schedulers."""
    return x_proactive_secret == PROACTIVE_TRIGGER_SECRET


@app.get("/proactive/status")
async def proactive_status():
    """
    Get status of all registered proactive agents.

    Returns agent list with their schedules and descriptions.
    """
    agents = list_proactive_agents()
    scheduler = get_scheduler()

    return {
        "status": "healthy",
        "agents": agents,
        "schedule_info": scheduler.get_schedule_info(),
    }


@app.post("/proactive/{agent_name}", response_model=ProactiveTriggerResponse)
async def trigger_proactive_agent(
    agent_name: str,
    request: ProactiveTriggerRequest,
    x_proactive_secret: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
):
    """
    Trigger a proactive agent for a user or all users.

    This endpoint can be called by:
    - External schedulers (using x-proactive-secret header)
    - Authenticated admin users (using authorization header)
    - pg_cron or Cloud Scheduler

    Args:
        agent_name: Name of the proactive agent to trigger
        request: Contains user_id (UUID or "all") and optional context
    """
    # Verify authentication
    is_secret_valid = verify_proactive_secret(x_proactive_secret)
    is_admin = False

    if authorization and SUPABASE_JWT_SECRET:
        try:
            token = authorization.replace("Bearer ", "")
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            # Check for admin role (future: implement proper role checking)
            is_admin = payload.get("role") == "admin" or payload.get("sub") is not None
        except jwt.InvalidTokenError:
            pass

    if not is_secret_valid and not is_admin:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Provide x-proactive-secret header or valid admin token"
        )

    # Validate agent exists
    scheduler = get_scheduler()
    agent = scheduler.get_agent(agent_name)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {agent_name}. Available: {[a['name'] for a in list_proactive_agents()]}"
        )

    try:
        if request.user_id == "all":
            # Trigger for all users
            result = await trigger_agent_for_all(
                agent_name,
                context=request.context
            )
            return ProactiveTriggerResponse(
                success=result.get("success", False),
                message=f"Triggered {agent_name} for {result.get('total_users', 0)} users",
                agent_name=agent_name,
                data=result,
            )
        else:
            # Trigger for single user
            result = await trigger_agent(
                agent_name,
                request.user_id,
                context=request.context
            )
            return ProactiveTriggerResponse(
                success=result.success,
                message=result.message,
                agent_name=agent_name,
                data=result.data,
                error=result.error,
            )

    except Exception as e:
        return ProactiveTriggerResponse(
            success=False,
            message="Execution failed",
            agent_name=agent_name,
            error=str(e),
        )


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8081))
    uvicorn.run(app, host="0.0.0.0", port=port)
