import os
import sys
import json
import logging
import argparse
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional

import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("DailyReportGenerator")

# Load environment variables
load_dotenv()

class DailyReportGenerator:
    """
    Orchestrates the daily report generation process:
    1. Fetches user data (Tasks, Memories, Contacts)
    2. Calculates productivity metrics
    3. Generates AI insights via Gemini
    4. Saves report to Supabase
    """
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        if not all([self.supabase_url, self.supabase_key, self.gemini_api_key]):
            logger.error("Missing required environment variables.")
            sys.exit(1)
            
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        genai.configure(api_key=self.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def get_users_to_process(self) -> List[Dict[str, Any]]:
        """Step 2: Get active users who should receive reports."""
        try:
            response = self.supabase.table("users").select("id, email, name").eq("is_active", True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to fetch users: {e}")
            return []

    def fetch_user_data(self, user_id: str, report_date: str) -> Dict[str, Any]:
        """Steps 5-8: Fetch all relevant data for the user for the given date."""

        # Date filtering
        start_of_day = f"{report_date}T00:00:00"
        end_of_day = f"{report_date}T23:59:59"
        # Next day timestamp to avoid duplicate parameters in query
        from datetime import datetime as dt
        next_day = (dt.fromisoformat(end_of_day.replace('Z', '+00:00')) + timedelta(days=1)).isoformat()

        try:
            # 1. Completed Tasks (Step 5)
            completed_tasks = self.supabase.table("work_items")\
                .select("id, title, estimated_duration, completed_at, association_id")\
                .eq("user_id", user_id)\
                .gte("completed_at", start_of_day)\
                .lt("completed_at", next_day)\
                .execute().data

            # 2. All Tasks Created/Active (Step 6)
            # Used for total count to calculate completion rate
            all_tasks = self.supabase.table("work_items")\
                .select("id, state")\
                .eq("user_id", user_id)\
                .gte("created_at", start_of_day)\
                .lt("created_at", next_day)\
                .execute().data

            # 3. Memories (Step 7)
            memories = self.supabase.table("memories")\
                .select("id, sentiment, summary, triggers, subjects, importance, sentiment_score")\
                .eq("user_id", user_id)\
                .gte("created_at", start_of_day)\
                .lt("created_at", next_day)\
                .order("created_at", desc=True)\
                .limit(50)\
                .execute().data
                
            # 4. Contacts (Step 8)
            # Note: Assuming contact_network has last_interaction_at updated
            contacts = self.supabase.table("contact_network")\
                .select("id, name, last_interaction_at")\
                .eq("user_id", user_id)\
                .gte("last_interaction_at", start_of_day)\
                .order("last_interaction_at", desc=True)\
                .limit(10)\
                .execute().data
                
            return {
                "tasks_completed": completed_tasks,
                "all_tasks": all_tasks,
                "memories": memories,
                "contacts": contacts
            }
            
        except Exception as e:
            logger.error(f"Error fetching data for user {user_id}: {e}")
            return {}

    def calculate_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Step 9: Calculate metrics using Python logic (replacing JS Function node)."""
        tasks_completed = data.get("tasks_completed", [])
        all_tasks = data.get("all_tasks", [])
        memories = data.get("memories", [])
        contacts = data.get("contacts", [])
        
        # Task Metrics
        tasks_completed_count = len(tasks_completed)
        tasks_total_count = len(all_tasks) # Note: Logic might range based on definition of "Total" (Assigned vs Created)
        completion_rate = (tasks_completed_count / tasks_total_count * 100) if tasks_total_count > 0 else 0
        
        # Time Metrics
        total_time_spent = sum(task.get("estimated_duration", 0) or 0 for task in tasks_completed)
        
        # Memory Metrics
        sentiment_scores = [m.get("sentiment_score", 0) for m in memories if m.get("sentiment_score") is not None]
        average_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        
        all_subjects = []
        for m in memories:
            all_subjects.extend(m.get("subjects", []) or [])
        top_subjects = list(set(all_subjects))[:5]
        
        # Productivity Score (0-100)
        # Formula adapted from N8N workflow
        score = 50 # Base
        score += min(30, (tasks_completed_count / 10) * 30)
        score += min(20, (total_time_spent / 480) * 20) # 480 min = 8 hours
        score += min(20, len(memories) * 2)
        productivity_score = min(100, score)
        
        return {
            "tasks_completed_count": tasks_completed_count,
            "tasks_total_count": tasks_total_count,
            "completion_rate": completion_rate,
            "total_time_spent": total_time_spent,
            "average_sentiment": average_sentiment,
            "top_subjects": top_subjects,
            "productivity_score": productivity_score,
            "memory_count": len(memories),
            "contact_count": len(contacts),
            "top_contacts": [c.get("name") for c in contacts]
        }

    def generate_ai_insights(self, user_name: str, report_date: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Step 11: Call Gemini for qualitative analysis."""
        
        prompt = f"""
        Generate a daily report summary for the following data:
        
        Date: {report_date}
        User: {user_name}
        Tasks Completed: {metrics['tasks_completed_count']}/{metrics['tasks_total_count']}
        Time Spent: {metrics['total_time_spent']} minutes
        Average Sentiment: {metrics['average_sentiment']:.2f} (scale -1 to 1)
        Top Subjects/Contexts: {', '.join(metrics['top_subjects'])}
        Memories Created: {metrics['memory_count']}
        Contacts Interacted: {metrics['contact_count']}
        Top Contacts: {', '.join(metrics['top_contacts'])}
        
        Format the output strictly as a JSON object with this structure:
        {{
            "summary": "2-3 sentence overview of the day",
            "key_insights": ["insight1", "insight2", "insight3"],
            "patterns_detected": ["pattern1", "pattern2"],
            "ai_recommendations": ["recommendation1", "recommendation2"],
            "suggested_focus_areas": ["area1", "area2"]
        }}
        
        Be encouraging, constructive, and focus on actionable insights suitable for a personal productivity OS.
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini API failure: {e}")
            # Fallback
            return {
                "summary": "Data processed, but AI insights unavailable.",
                "key_insights": [],
                "patterns_detected": [],
                "ai_recommendations": [],
                "suggested_focus_areas": []
            }

    def save_report(self, user_id: str, report_date: str, metrics: Dict[str, Any], insights: Dict[str, Any]):
        """Step 13: Insert the report into Supabase."""
        
        report_payload = {
            "user_id": user_id,
            "report_date": report_date,
            "tasks_completed": metrics["tasks_completed_count"],
            "tasks_total": metrics["tasks_total_count"],
            "productivity_score": metrics["productivity_score"],
            "mood_score": metrics["average_sentiment"],
            "active_modules": metrics["top_subjects"],
            "top_interactions": metrics["top_contacts"],
            "summary": insights.get("summary"),
            "key_insights": insights.get("key_insights"),
            "patterns_detected": insights.get("patterns_detected"),
            "ai_recommendations": insights.get("ai_recommendations"),
            "suggested_focus_areas": insights.get("suggested_focus_areas"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would insert report for {user_id}:")
            print(json.dumps(report_payload, indent=2, sort_keys=True, default=str))
            return
            
        try:
            # Check if exists to update or insert? Usually reports are unique per date/user.
            # Assuming upsert or simple insert.
            self.supabase.table("daily_reports").insert(report_payload).execute()
            logger.info(f"Report saved for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to save report: {e}")

    def run(self, specific_date: Optional[str] = None):
        """Main execution flow."""
        report_date = specific_date or date.today().isoformat()
        logger.info(f"Starting Daily Report Generation for {report_date}")
        
        users = self.get_users_to_process()
        logger.info(f"Found {len(users)} active users.")
        
        for user in users:
            user_id = user['id']
            user_name = user.get('name', 'User')
            logger.info(f"Processing user: {user_name} ({user_id})")
            
            # Extract
            data = self.fetch_user_data(user_id, report_date)
            
            # Transform
            metrics = self.calculate_metrics(data)
            
            # AI Analysis
            insights = self.generate_ai_insights(user_name, report_date, metrics)
            
            # Load
            self.save_report(user_id, report_date, metrics, insights)
            
        logger.info("Daily Report Generation Completed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Aica Daily Reports")
    parser.add_argument("--dry-run", action="store_true", help="Calculate and print but do not save to DB")
    parser.add_argument("--date", type=str, help="YYYY-MM-DD date to generate report for (default: today)")
    
    args = parser.parse_args()
    
    generator = DailyReportGenerator(dry_run=args.dry_run)
    generator.run(specific_date=args.date)
