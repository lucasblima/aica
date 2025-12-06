import os
import sys
import hmac
import hashlib
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException, Header, Response, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("EvolutionWebhook")

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
app = FastAPI(title="Evolution API Webhook Receiver")

# --- Helper Functions ---

async def get_or_create_contact_from_phone(phone_number: str) -> Optional[str]:
    """
    Get or create a contact from phone number.
    Returns the contact ID or None if failed.
    """
    try:
        # Try to find existing contact
        response = supabase.table('contact_network').select('id').eq('phone_number', phone_number).single().execute()
        if response.data:
            return response.data['id']
            
        # Create new contact
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

async def trigger_n8n_processing(payload: Dict[str, Any]) -> bool:
    """
    Trigger n8n workflow for message processing.
    """
    webhook_url = f"{N8N_BASE_URL}/webhook/message-processing"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {N8N_API_KEY}",
        # Some setups use X-API-Key, support both or check N8N setup
        "X-API-Key": N8N_API_KEY 
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(webhook_url, json=payload, headers=headers, timeout=10.0)
            if response.status_code >= 200 and response.status_code < 300:
                logger.info(f"Successfully triggered n8n workflow. Status: {response.status_code}")
                return True
            else:
                logger.error(f"Failed to trigger n8n: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error calling n8n: {e}")
            return False

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
    
    # Extract text (Conversation, ExtendedText, ImageCaption)
    text = ""
    if "conversation" in message_content:
        text = message_content["conversation"]
    elif "extendedTextMessage" in message_content:
        text = message_content["extendedTextMessage"].get("text", "")
    elif "imageMessage" in message_content:
        text = message_content["imageMessage"].get("caption", "")
    
    # If no text found (e.g. strict media message without caption), skip or handle accordingly
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

# --- Routes ---

@app.get("/webhook/evolution")
async def verify_webhook(
    mode: str = "", 
    challenge: str = "", 
    verify_token: str = ""
):
    """
    Evolution API Verification Endpoint.
    """
    if mode == "subscribe" and verify_token == EVOLUTION_WEBHOOK_VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Forbidden")

@app.post("/webhook/evolution")
async def handle_webhook(request: Request):
    """
    Main Webhook Handler.
    """
    # 1. Signature Validation
    # Evolution sends raw body in signature calculation
    body_bytes = await request.body()
    signature_header = request.headers.get("x-signature")
    
    if EVOLUTION_WEBHOOK_SECRET and signature_header:
        # Calculate HMAC SHA256
        hash_calc = hmac.new(
            EVOLUTION_WEBHOOK_SECRET.encode(), 
            body_bytes, 
            hashlib.sha256
        ).hexdigest()
        
        if hash_calc != signature_header:
            logger.warning("Invalid webhook signature.")
            # Depending on strictness, might want to return 401
            # But mostly we log and allow if testing, or raise 401
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    data = payload.get("data", {})
    
    # We only care about upsert (new messages)
    if event != "messages.upsert":
        return {"success": True, "message": "Ignored event type"}
        
    # Ignore messages sent by me
    if data.get("key", {}).get("fromMe", False):
        return {"success": True, "message": "Ignored fromMe message"}

    # 2. Extract Data
    message_data = extract_message_data(payload)
    if not message_data:
        # Could be a status update or media without caption, just ack
        return {"success": True, "message": "No extractable content"}
        
    logger.info(f"Received message from {message_data['from']}")

    # 3. Queue Processing (Async to n8n)
    # Get Contact ID
    contact_id = await get_or_create_contact_from_phone(message_data['from'])
    
    if not contact_id:
        logger.error("Could not obtain contact_id, skipping processing.")
        return {"success": False, "error": "Contact resolution failed"}
        
    # Prepare N8N Payload
    processing_payload = {
        "raw_message": message_data,
        "contact_id": contact_id,
        "user_id": message_data["webhook_id"], # Logic per TS code
        "timestamp": datetime.fromtimestamp(message_data["timestamp"]).isoformat()
    }
    
    # Trigger N8N (fire and forget logic typically, but here we wait for ack)
    # For high volume, create a background task
    asyncio.create_task(trigger_n8n_processing(processing_payload))

    return {"success": True}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    # For local testing
    uvicorn.run("scripts.evolution_webhook_server:app", host="0.0.0.0", port=8000, reload=True)
