import os
import sys
import json
import logging
import argparse
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime

import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("MessageProcessor")

# Load environment variables
load_dotenv()

class MessageProcessor:
    """
    Handles the privacy-first processing of raw messages:
    1. Analysis (Sentiment, Triggers) via Gemini
    2. Vector Embedding generation
    3. Memory storage in Supabase
    4. Contact health score updates
    5. Raw data discard
    """

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        if not all([self.supabase_url, self.supabase_key, self.gemini_api_key]):
            logger.error("Missing required environment variables.")
            sys.exit(1)

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        genai.configure(api_key=self.gemini_api_key)
        self.model_flash = genai.GenerativeModel('gemini-2.5-flash')
        self.embedding_model = 'models/text-embedding-004'

    async def analyze_message(self, message_text: str) -> Dict[str, Any]:
        """Call Gemini to extract structured insights."""
        prompt = f"""
        Analyze the following WhatsApp message and extract structured insights. Return ONLY valid JSON.
        
        Message: "{message_text}"
        
        Respond with ONLY this JSON structure:
        {{
          "sentiment": "positive|negative|neutral|mixed",
          "sentiment_score": -1 to 1,
          "triggers": ["trigger1", "trigger2"],
          "subjects": ["subject1", "subject2"],
          "summary": "Brief summary of message (max 500 chars)",
          "importance": 0 to 1,
          "tags": ["tag1", "tag2"]
        }}
        
        Guidelines:
        - sentiment_score: -1 (very negative) to 1 (very positive)
        - importance: 0 (trivial) to 1 (critical)
        - summary: Concise, preserving context, no PII if possible.
        """

        try:
            # Run in executor to avoid blocking async loop if using sync SDK methods
            response = await asyncio.to_thread(
                self.model_flash.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini Analysis Failed: {e}")
            # Fallback
            return {
                "sentiment": "neutral",
                "sentiment_score": 0,
                "triggers": [],
                "subjects": [],
                "summary": message_text[:100],
                "importance": 0.1,
                "tags": ["processing_error"]
            }

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for the text."""
        try:
            result = await asyncio.to_thread(
                genai.embed_content,
                model=self.embedding_model,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return []

    async def save_memory(self, user_id: str, contact_id: str, raw_msg: Dict[str, Any], insight: Dict[str, Any], embedding: List[float]) -> Optional[str]:
        """Insert structured memory into Supabase."""
        
        memory_payload = {
            "user_id": user_id,
            "source_type": "message",
            "source_id": raw_msg.get("webhook_id", ""),
            "source_contact_id": contact_id,
            "sentiment": insight.get("sentiment"),
            "sentiment_score": insight.get("sentiment_score"),
            "triggers": insight.get("triggers", []),
            "subjects": insight.get("subjects", []),
            "summary": insight.get("summary"),
            "embedding": embedding,
            "importance": insight.get("importance", 0.5),
            "tags": insight.get("tags", []),
            "is_active": True,
            "privacy_level": "private",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        try:
            response = await asyncio.to_thread(
                lambda: self.supabase.table("memories").insert(memory_payload).select("id").execute()
            )
            if response.data:
                return response.data[0]['id']
        except Exception as e:
            logger.error(f"Failed to save memory: {e}")
            return None

    async def update_contact_health(self, contact_id: str, timestamp: int, insight: Dict[str, Any]):
        """Update contact interaction stats and health score."""
        try:
            # 1. Fetch current contact data
            contact_resp = await asyncio.to_thread(
                lambda: self.supabase.table("contact_network").select("health_score, interaction_count, interaction_topics").eq("id", contact_id).single().execute()
            )
            contact = contact_resp.data
            
            if not contact:
                return

            # 2. Calculate new health score
            current_health = contact.get("health_score") or 50
            sentiment_score = insight.get("sentiment_score", 0)
            adjustment = 0
            if sentiment_score > 0.5: adjustment = 2
            elif sentiment_score < -0.5: adjustment = -2
            
            new_health = max(0, min(100, current_health + adjustment))
            
            # 3. Update topics
            current_topics = contact.get("interaction_topics") or []
            new_topics = list(set(current_topics + insight.get("subjects", [])))[:10] # Keep top 10 unique
            
            # 4. Perform Update
            update_payload = {
                "last_interaction_at": datetime.fromtimestamp(timestamp).isoformat(),
                "interaction_count": (contact.get("interaction_count") or 0) + 1,
                "health_score": new_health,
                "interaction_topics": new_topics,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            await asyncio.to_thread(
                lambda: self.supabase.table("contact_network").update(update_payload).eq("id", contact_id).execute()
            )
            logger.info(f"Updated contact {contact_id} health to {new_health}")
            
        except Exception as e:
            logger.error(f"Failed to update contact health: {e}")

    async def process_single_message(self, raw_message: Dict[str, Any], contact_id: str, user_id: str) -> bool:
        """Main pipeline execution for a single message."""
        
        message_text = raw_message.get("message", "")
        if not message_text:
            logger.warning("Empty message text, skipping.")
            return False

        logger.info(f"Processing message from {raw_message.get('from')} for user {user_id}")

        # 1. Analyze
        insight = await self.analyze_message(message_text)
        
        # 2. Embed
        # Embed the summary for better retrieval context than raw message
        text_to_embed = insight.get("summary") or message_text 
        embedding = await self.generate_embedding(text_to_embed)
        
        # 3. Save Memory
        memory_id = await self.save_memory(user_id, contact_id, raw_message, insight, embedding)
        
        if memory_id:
            logger.info(f"Memory created: {memory_id}")
            # 4. Update Contact
            timestamp = raw_message.get("timestamp", int(datetime.utcnow().timestamp()))
            await self.update_contact_health(contact_id, timestamp, insight)
            return True
        else:
            logger.error("Failed to create memory.")
            return False

async def main():
    # CLI usage for testing or standalone execution
    parser = argparse.ArgumentParser(description="Process a single message content")
    parser.add_argument("--message", type=str, required=True, help="Message text")
    parser.add_argument("--contact_id", type=str, required=True, help="UUID of contact")
    parser.add_argument("--user_id", type=str, required=True, help="UUID of user")
    
    args = parser.parse_args()
    
    processor = MessageProcessor()
    
    # Mock raw message structure for CLI
    mock_raw_message = {
        "message": args.message,
        "from": "CLI_TEST",
        "timestamp": int(datetime.utcnow().timestamp()),
        "webhook_id": "cli-test-" + datetime.utcnow().strftime("%Y%m%d%H%M%S")
    }
    
    success = await processor.process_single_message(mock_raw_message, args.contact_id, args.user_id)
    if success:
        print("Processing successful.")
        sys.exit(0)
    else:
        print("Processing failed.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
