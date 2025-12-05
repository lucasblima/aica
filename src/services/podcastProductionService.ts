/**
 * Podcast Production Service
 *
 * Manages all podcast production workflow operations including:
 * - Guest research (podcast_guest_research table)
 * - Episode production state (podcast_episodes columns)
 * - Recording management
 * - Post-production tasks
 */

import { supabase } from './supabaseClient';
import { performDeepResearch, mockDeepResearch } from '../api/geminiDeepResearch';

// ============================================================================
// TYPES
// ============================================================================

export interface GuestResearch {
  id?: string;
  episode_id: string;
  guest_name: string;
  guest_reference?: string;

  // Profile search
  profile_search_completed?: boolean;
  profile_search_at?: string;
  profile_confidence_score?: number;

  // Biography
  biography?: string;
  bio_summary?: string;
  bio_sources?: Array<{ url: string; title: string; date: string }>;

  // Technical sheet
  full_name?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  occupation?: string;
  known_for?: string;
  education?: string;
  awards?: Array<{ name: string; year: number; organization?: string }>;
  social_media?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };

  // Controversies & news
  controversies?: Array<{
    title: string;
    summary: string;
    source: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    date: string;
  }>;
  recent_news?: Array<{
    title: string;
    url: string;
    source: string;
    date: string;
  }>;

  // Custom sources
  custom_sources?: Array<{
    type: 'pdf' | 'link' | 'text';
    content: string;
    name: string;
  }>;

  // AI chat
  chat_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;

  // Metadata
  low_context_warning?: boolean;
  research_quality_score?: number;

  created_at?: string;
  updated_at?: string;
}

export interface EpisodeProductionUpdate {
  // Wizard data
  guest_reference?: string;
  theme_mode?: 'auto' | 'manual';
  scheduled_time?: string;

  // Recording state
  recording_duration?: number;
  recording_started_at?: string;
  recording_finished_at?: string;
  recording_status?: 'idle' | 'recording' | 'paused' | 'finished';
  recording_file_path?: string;
  recording_file_size?: number;

  // Post-production
  transcript?: string;
  transcript_generated_at?: string;
  cuts_generated?: boolean;
  cuts_metadata?: Array<{
    start_time: number;
    end_time: number;
    title: string;
    platform: 'tiktok' | 'reels' | 'shorts';
  }>;
  blog_post_generated?: boolean;
  blog_post_url?: string;
  published_to_social?: {
    youtube?: boolean;
    spotify?: boolean;
    apple_podcasts?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface TopicWithSponsor {
  id: string;
  episode_id: string;
  category?: string;
  question_text: string;
  sponsor_script?: string;
  is_sponsor_topic?: boolean;
  completed?: boolean;
  order?: number;
}

// ============================================================================
// GUEST RESEARCH OPERATIONS
// ============================================================================

/**
 * Get guest research for an episode
 */
export const getGuestResearch = async (episodeId: string): Promise<GuestResearch | null> => {
  try {
    const { data, error } = await supabase
      .from('podcast_guest_research')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - this is expected for new episodes
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching guest research for episode ${episodeId}:`, error);
    return null;
  }
};

/**
 * Create guest research for an episode
 */
export const createGuestResearch = async (
  research: Omit<GuestResearch, 'id' | 'created_at' | 'updated_at'>
): Promise<GuestResearch | null> => {
  try {
    const { data, error } = await supabase
      .from('podcast_guest_research')
      .insert([research])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating guest research:', error);
    return null;
  }
};

/**
 * Update guest research
 */
export const updateGuestResearch = async (
  id: string,
  updates: Partial<GuestResearch>
): Promise<GuestResearch | null> => {
  try {
    const { data, error } = await supabase
      .from('podcast_guest_research')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating guest research ${id}:`, error);
    return null;
  }
};

/**
 * Search guest profile using Gemini Deep Research
 * This is called from GuestIdentificationWizard Step 2
 */
export const searchGuestProfile = async (
  guestName: string,
  guestReference?: string
): Promise<{
  success: boolean;
  data?: Partial<GuestResearch>;
  error?: string;
}> => {
  try {
    // Construct research query
    const query = guestReference
      ? `${guestName} - ${guestReference}`
      : guestName;

    // Call Gemini Deep Research API
    // Use mock if API key is not configured
    const result = await performDeepResearch({
      query,
      include_sources: true,
    }).catch(() => {
      console.warn('Gemini API failed, using mock data');
      return mockDeepResearch(query);
    });

    // Transform Gemini response to GuestResearch format
    const guestData: Partial<GuestResearch> = {
      guest_name: guestName,
      guest_reference: guestReference,
      profile_search_completed: true,
      profile_search_at: new Date().toISOString(),
      profile_confidence_score: result.confidence_score || 75,
      biography: result.biography,
      bio_summary: result.summary,
      bio_sources: result.sources || [],
      full_name: result.full_name,
      birth_date: result.birth_date,
      birth_place: result.birth_place,
      nationality: result.nationality,
      occupation: result.occupation,
      known_for: result.known_for,
      education: result.education,
      awards: result.awards || [],
      social_media: result.social_media || {},
      controversies: result.controversies || [],
      recent_news: result.recent_news || [],
      low_context_warning: result.sources?.length < 3,
      research_quality_score: result.quality_score || 70,
    };

    return {
      success: true,
      data: guestData,
    };
  } catch (error) {
    console.error('Error searching guest profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Add custom source to guest research
 */
export const addCustomSource = async (
  researchId: string,
  source: { type: 'pdf' | 'link' | 'text'; content: string; name: string }
): Promise<boolean> => {
  try {
    // Get current research
    const { data: current, error: fetchError } = await supabase
      .from('podcast_guest_research')
      .select('custom_sources')
      .eq('id', researchId)
      .single();

    if (fetchError) throw fetchError;

    const customSources = current.custom_sources || [];
    customSources.push(source);

    // Update with new source
    const { error: updateError } = await supabase
      .from('podcast_guest_research')
      .update({ custom_sources: customSources })
      .eq('id', researchId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error adding custom source:', error);
    return false;
  }
};

/**
 * Add chat message to research history
 */
export const addChatMessage = async (
  researchId: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<boolean> => {
  try {
    // Get current research
    const { data: current, error: fetchError } = await supabase
      .from('podcast_guest_research')
      .select('chat_history')
      .eq('id', researchId)
      .single();

    if (fetchError) throw fetchError;

    const chatHistory = current.chat_history || [];
    chatHistory.push({
      ...message,
      timestamp: new Date().toISOString(),
    });

    // Update with new message
    const { error: updateError } = await supabase
      .from('podcast_guest_research')
      .update({ chat_history: chatHistory })
      .eq('id', researchId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error adding chat message:', error);
    return false;
  }
};

// ============================================================================
// EPISODE PRODUCTION OPERATIONS
// ============================================================================

/**
 * Update episode production data
 */
export const updateEpisodeProduction = async (
  episodeId: string,
  updates: EpisodeProductionUpdate
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update(updates)
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error updating episode production ${episodeId}:`, error);
    return false;
  }
};

/**
 * Start recording
 */
export const startRecording = async (episodeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        recording_status: 'recording',
        recording_started_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error starting recording for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Pause recording
 */
export const pauseRecording = async (episodeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        recording_status: 'paused',
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error pausing recording for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Resume recording
 */
export const resumeRecording = async (episodeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        recording_status: 'recording',
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error resuming recording for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Finish recording
 */
export const finishRecording = async (
  episodeId: string,
  filePath?: string,
  fileSize?: number
): Promise<boolean> => {
  try {
    const now = new Date().toISOString();

    // Get start time to calculate duration
    const { data: episode, error: fetchError } = await supabase
      .from('podcast_episodes')
      .select('recording_started_at')
      .eq('id', episodeId)
      .single();

    if (fetchError) throw fetchError;

    let duration = 0;
    if (episode?.recording_started_at) {
      const startTime = new Date(episode.recording_started_at);
      const endTime = new Date(now);
      duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // Duration in seconds
    }

    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        recording_status: 'finished',
        recording_finished_at: now,
        recording_duration: duration,
        recording_file_path: filePath,
        recording_file_size: fileSize,
        status: 'recorded', // Update episode status
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error finishing recording for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Get recording status
 */
export const getRecordingStatus = async (episodeId: string): Promise<{
  status: 'idle' | 'recording' | 'paused' | 'finished';
  duration?: number;
  startedAt?: string;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('recording_status, recording_duration, recording_started_at')
      .eq('id', episodeId)
      .single();

    if (error) throw error;

    return {
      status: data.recording_status || 'idle',
      duration: data.recording_duration,
      startedAt: data.recording_started_at,
    };
  } catch (error) {
    console.error(`Error fetching recording status for episode ${episodeId}:`, error);
    return null;
  }
};

// ============================================================================
// TOPIC OPERATIONS (with sponsor script)
// ============================================================================

/**
 * Update topic with sponsor script
 */
export const updateTopicSponsorScript = async (
  topicId: string,
  sponsorScript: string,
  isSponsorTopic: boolean = true
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('podcast_topics')
      .update({
        sponsor_script: sponsorScript,
        is_sponsor_topic: isSponsorTopic,
      })
      .eq('id', topicId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error updating topic sponsor script ${topicId}:`, error);
    return false;
  }
};

/**
 * Get topics with sponsor scripts for teleprompter
 */
export const getTopicsForTeleprompter = async (
  episodeId: string
): Promise<TopicWithSponsor[]> => {
  try {
    const { data, error } = await supabase
      .from('podcast_topics')
      .select('id, episode_id, category, question_text, sponsor_script, is_sponsor_topic, completed, order')
      .eq('episode_id', episodeId)
      .eq('archived', false)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching topics for episode ${episodeId}:`, error);
    return [];
  }
};

// ============================================================================
// POST-PRODUCTION OPERATIONS
// ============================================================================

/**
 * Generate transcript (placeholder - integrate with actual transcription service)
 */
export const generateTranscript = async (episodeId: string): Promise<boolean> => {
  try {
    // TODO: Integrate with transcription service (Whisper API, AssemblyAI, etc.)
    // For now, just mark as generated
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        transcript: 'Transcript will be generated by transcription service',
        transcript_generated_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error generating transcript for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Generate cuts (placeholder - integrate with video editing service)
 */
export const generateCuts = async (episodeId: string): Promise<boolean> => {
  try {
    // TODO: Integrate with video editing service (Opus Clip, etc.)
    const cutsMetadata = [
      { start_time: 120, end_time: 180, title: 'Best moment 1', platform: 'tiktok' as const },
      { start_time: 300, end_time: 360, title: 'Best moment 2', platform: 'reels' as const },
    ];

    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        cuts_generated: true,
        cuts_metadata: cutsMetadata,
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error generating cuts for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Generate blog post (placeholder - integrate with AI writing service)
 */
export const generateBlogPost = async (episodeId: string): Promise<boolean> => {
  try {
    // TODO: Integrate with AI writing service
    const blogPostUrl = `https://blog.example.com/episode-${episodeId}`;

    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        blog_post_generated: true,
        blog_post_url: blogPostUrl,
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error generating blog post for episode ${episodeId}:`, error);
    return false;
  }
};

/**
 * Publish to social media (placeholder)
 */
export const publishToSocial = async (
  episodeId: string,
  platforms: string[]
): Promise<boolean> => {
  try {
    // TODO: Integrate with social media APIs
    const publishedStatus = platforms.reduce((acc, platform) => {
      acc[platform] = true;
      return acc;
    }, {} as Record<string, boolean>);

    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        published_to_social: publishedStatus,
      })
      .eq('id', episodeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error publishing to social for episode ${episodeId}:`, error);
    return false;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate recording duration using Supabase function
 */
export const calculateRecordingDuration = async (episodeId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('calculate_recording_duration', {
      p_episode_id: episodeId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error(`Error calculating recording duration for episode ${episodeId}:`, error);
    return 0;
  }
};
