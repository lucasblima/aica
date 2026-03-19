-- Add updated_at triggers to key mutable tables that are missing them
-- Uses existing update_updated_at_column() function

-- Key mutable tables
CREATE TRIGGER update_podcast_episodes_updated_at
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_podcast_shows_updated_at
  BEFORE UPDATE ON public.podcast_shows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_podcast_topics_updated_at
  BEFORE UPDATE ON public.podcast_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_threads_updated_at
  BEFORE UPDATE ON public.conversation_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grant_projects_updated_at
  BEFORE UPDATE ON public.grant_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grant_opportunities_updated_at
  BEFORE UPDATE ON public.grant_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_consciousness_stats_updated_at
  BEFORE UPDATE ON public.user_consciousness_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secondary mutable tables
CREATE TRIGGER update_grant_briefings_updated_at
  BEFORE UPDATE ON public.grant_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grant_collaborators_updated_at
  BEFORE UPDATE ON public.grant_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grant_responses_updated_at
  BEFORE UPDATE ON public.grant_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_extracted_entities_updated_at
  BEFORE UPDATE ON public.whatsapp_extracted_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_group_participants_updated_at
  BEFORE UPDATE ON public.whatsapp_group_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_patterns_updated_at
  BEFORE UPDATE ON public.user_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_digital_sabbatical_state_updated_at
  BEFORE UPDATE ON public.digital_sabbatical_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_questions_updated_at
  BEFORE UPDATE ON public.daily_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_analysis_updated_at
  BEFORE UPDATE ON public.contact_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
