"""
AICA Life OS - ADK Agents FastAPI Entry Point

Serves the ADK multi-agent system via FastAPI on Cloud Run.
Uses ADK's get_fast_api_app() for standard agent endpoints,
plus a custom /api/agent/chat endpoint for frontend integration.

Endpoints:
  - /run_sse: ADK standard SSE endpoint for agent execution
  - /api/agent/chat: Custom endpoint for AICA frontend integration
  - /health: Health check for Cloud Run

Usage:
  uvicorn main_agents:app --host 0.0.0.0 --port 8081
"""

import os
import json
import asyncio
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Depends
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

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://aica-staging-5p22u2w6jq-rj.a.run.app",
]

APP_NAME = "aica-agents"

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
# MAIN
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8081))
    uvicorn.run(app, host="0.0.0.0", port=port)
