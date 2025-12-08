import os
import sys
import hmac
import hashlib
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, date

from fastapi import FastAPI, Request, HTTPException, Header, Response, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx
import uvicorn

# Import logic from other scripts
# Note: we assume the script is run from project root: python -m scripts.aica_api_server
try:
    from scripts.generate_daily_report import DailyReportGenerator
    from scripts.process_message import MessageProcessor
except ImportError:
    # If running directly from within scripts folder, path adjustment might be needed
    # But standard way is running as module from root
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from scripts.generate_daily_report import DailyReportGenerator
    from scripts.process_message import MessageProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("AicaAPIServer")

# Load environment variables
load_dotenv()

# Environment Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
EVOLUTION_WEBHOOK_SECRET = os.getenv("EVOLUTION_WEBHOOK_SECRET", "")
EVOLUTION_WEBHOOK_VERIFY_TOKEN = os.getenv("EVOLUTION_WEBHOOK_VERIFY_TOKEN", "aica_webhook")
EVOLUTION_BOT_PHONE = os.getenv("EVOLUTION_BOT_PHONE", "")
N8N_BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678")
N8N_API_KEY = os.getenv("N8N_API_KEY", "")
DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    logger.error("Missing required Supabase configuration.")
    sys.exit(1)

# Initialize Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize FastAPI app
app = FastAPI(title="Aica Python API Server")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions (Webhook) ---

async def get_or_create_contact_from_phone(phone_number: str) -> Optional[str]:
    """
    Get or create a contact from phone number.
    Returns the contact ID or None if failed.
    """
    try:
        response = supabase.table('contact_network').select('id').eq('phone_number', phone_number).single().execute()
        if response.data:
            return response.data['id']
            
        if not DEFAULT_USER_ID:
            logger.warning("DEFAULT_USER_ID not set, cannot create contact.")
            return None
            
        new_contact = {
            "user_id": DEFAULT_USER_ID,
            "name": phone_number,
            "phone_number": phone_number,
            "engagement_level": "low",
            "interaction_count": 0,
            "tags": ["auto_created_from_message"]
        }
        
        response = supabase.table('contact_network').insert(new_contact).select('id').single().execute()
        if response.data:
            logger.info(f"Created new contact for {phone_number}")
            return response.data['id']
            
    except Exception as e:
        logger.error(f"Error in get_or_create_contact_from_phone: {e}")
        return None
    return None

def extract_message_data(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract normalized message data from Evolution API payload.
    """
    data = payload.get("data", {})
    key = data.get("key", {})
    message_content = data.get("message", {})
    
    if not key or not message_content:
        return None
        
    remote_jid = key.get("remoteJid")
    message_id = key.get("id")
    timestamp = data.get("timestamp") or int(datetime.utcnow().timestamp())
    
    text = ""
    if "conversation" in message_content:
        text = message_content["conversation"]
    elif "extendedTextMessage" in message_content:
        text = message_content["extendedTextMessage"].get("text", "")
    elif "imageMessage" in message_content:
        text = message_content["imageMessage"].get("caption", "")
    
    if not text:
        return None
        
    return {
        "from": remote_jid,
        "to": EVOLUTION_BOT_PHONE,
        "message": text,
        "timestamp": timestamp,
        "message_id": message_id,
        "webhook_id": f"evolution-{message_id}"
    }

# --- Shared Models ---

class GenerateReportRequest(BaseModel):
    user_id: Optional[str] = None
    report_date: Optional[str] = None

class ProcessMessageRequest(BaseModel):
    message_text: str
    contact_id: str
    user_id: str

# --- Routes ---

# 1. Evolution API Webhook
@app.get("/webhook/evolution")
async def verify_webhook(mode: str = "", challenge: str = "", verify_token: str = ""):
    if mode == "subscribe" and verify_token == EVOLUTION_WEBHOOK_VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Forbidden")

@app.post("/webhook/evolution")
async def handle_webhook(request: Request):
    # Signature calc
    body_bytes = await request.body()
    signature_header = request.headers.get("x-signature")
    
    if EVOLUTION_WEBHOOK_SECRET and signature_header:
        hash_calc = hmac.new(EVOLUTION_WEBHOOK_SECRET.encode(), body_bytes, hashlib.sha256).hexdigest()
        if hash_calc != signature_header:
            logger.warning("Invalid webhook signature.")
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    data = payload.get("data", {})
    
    if event != "messages.upsert":
        return {"success": True, "message": "Ignored event type"}
    if data.get("key", {}).get("fromMe", False):
        return {"success": True, "message": "Ignored fromMe message"}

    message_data = extract_message_data(payload)
    if not message_data:
        return {"success": True, "message": "No extractable content"}
        
    logger.info(f"Webhook Received: {message_data['from']}")

    contact_id = await get_or_create_contact_from_phone(message_data['from'])
    if not contact_id:
        return {"success": False, "error": "Contact resolution failed"}
        
    # INTEGRATION: Directly use Python Message Processor
    # This runs asynchronously (fire and forget for webhook speed)
    processor = MessageProcessor()
    
    # We need user_id, here taking from env default or trying to map from contact
    # For now utilizing DEFAULT_USER_ID or mapping
    target_user_id = DEFAULT_USER_ID or "unknown"
    
    asyncio.create_task(
        processor.process_single_message(message_data, contact_id, target_user_id)
    )

    return {"success": True}

# 2. API: Generate Daily Report
@app.post("/api/reports/generate")
async def generate_daily_report(req: GenerateReportRequest):
    """
    Trigger daily report generation manually.
    """
    logger.info(f"Manual Daily Report trigger for {req.report_date}")
    
    try:
        # Run sync generator in threadpool
        generator = DailyReportGenerator(dry_run=False)
        
        # Generator.run is synchronous
        await asyncio.to_thread(
            generator.run,
            specific_date=req.report_date
        )
        return {"success": True, "message": "Report generation completed"}
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 3. API: Process Message (Test/Manual)
@app.post("/api/messages/process")
async def manual_process_message(req: ProcessMessageRequest):
    """
    Manually process a text message (simulating incoming).
    """
    processor = MessageProcessor()
    
    mock_raw = {
        "message": req.message_text,
        "from": "MANUAL_API",
        "timestamp": int(datetime.utcnow().timestamp()),
        "webhook_id": f"manual-{int(datetime.utcnow().timestamp())}"
    }
    
    success = await processor.process_single_message(mock_raw, req.contact_id, req.user_id)
    
    if success:
        return {"success": True}
    else:
        raise HTTPException(status_code=500, detail="Processing failed")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Aica Python API"}

if __name__ == "__main__":
    uvicorn.run("scripts.aica_api_server:app", host="0.0.0.0", port=8000, reload=True)
