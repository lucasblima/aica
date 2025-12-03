/**
 * Contact Network Service
 *
 * Manages contact relationships, interaction tracking, and health scoring
 * WITHOUT storing raw message content (privacy-first)
 *
 * Key responsibilities:
 * 1. Track interaction metadata (frequency, last interaction, topics)
 * 2. Calculate relationship health scores
 * 3. Monitor sentiment trends
 * 4. Identify at-risk relationships
 * 5. Suggest relationship improvements
 */

import { supabase } from './supabaseClient';
import { ContactNetwork, ContactNetworkCreateInput, ContactNetworkUpdateInput, ContactNetworkStats } from '../types/memoryTypes';

// ============================================================================
// CONTACT CRUD OPERATIONS
// ============================================================================

/**
 * Get all active contacts for a user
 */
export async function getUserContacts(userId: string): Promise<ContactNetwork[]> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('last_interaction_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user contacts:', error);
    throw error;
  }
}

/**
 * Get a single contact by ID
 */
export async function getContactById(contactId: string): Promise<ContactNetwork | null> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error?.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching contact ${contactId}:`, error);
    throw error;
  }
}

/**
 * Get contact by phone number
 */
export async function getContactByPhone(
  userId: string,
  phoneNumber: string
): Promise<ContactNetwork | null> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching contact by phone ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Create a new contact
 */
export async function createContact(
  userId: string,
  input: ContactNetworkCreateInput
): Promise<ContactNetwork> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .insert([
        {
          user_id: userId,
          ...input,
          interaction_count: 0,
          engagement_level: 'low',
          health_score: 50, // Default neutral score
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
}

/**
 * Update contact information
 */
export async function updateContact(
  contactId: string,
  updates: ContactNetworkUpdateInput
): Promise<ContactNetwork> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating contact ${contactId}:`, error);
    throw error;
  }
}

/**
 * Archive a contact (soft delete)
 */
export async function archiveContact(contactId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('contact_network')
      .update({ is_archived: true })
      .eq('id', contactId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error archiving contact ${contactId}:`, error);
    throw error;
  }
}

/**
 * Delete a contact permanently
 */
export async function deleteContact(contactId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('contact_network')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting contact ${contactId}:`, error);
    throw error;
  }
}

// ============================================================================
// INTERACTION TRACKING
// ============================================================================

/**
 * Record an interaction with a contact
 * Called when a message is received from or sent to a contact
 */
export async function recordInteraction(
  contactId: string,
  data: {
    sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
    topics?: string[];
    response_time_minutes?: number;
  }
): Promise<void> {
  try {
    const contact = await getContactById(contactId);
    if (!contact) return;

    // Update interaction count and last interaction time
    const newInteractionCount = (contact.interaction_count || 0) + 1;
    const newLastInteractionAt = new Date().toISOString();

    // Calculate engagement level based on frequency
    const engagementLevel = calculateEngagementLevel(newInteractionCount);

    // Build update object
    const updates: any = {
      last_interaction_at: newLastInteractionAt,
      interaction_count: newInteractionCount,
      engagement_level: engagementLevel,
      updated_at: new Date().toISOString(),
    };

    // Add topics if provided
    if (data.topics && data.topics.length > 0) {
      const existingTopics = contact.interaction_topics || [];
      const newTopics = Array.from(new Set([...existingTopics, ...data.topics]));
      updates.interaction_topics = newTopics;
    }

    // Calculate response time average
    if (typeof data.response_time_minutes === 'number') {
      const existingAvg = contact.response_avg_time_hours || 0;
      const newAvg =
        (existingAvg * (newInteractionCount - 1) + data.response_time_minutes / 60) /
        newInteractionCount;
      updates.response_avg_time_hours = newAvg;
    }

    await updateContact(contactId, updates);
  } catch (error) {
    console.error(`Error recording interaction for contact ${contactId}:`, error);
  }
}

/**
 * Calculate engagement level based on interaction count
 */
function calculateEngagementLevel(
  interactionCount: number
): 'high' | 'medium' | 'low' | 'inactive' {
  // Assuming monthly basis
  if (interactionCount > 50) return 'high'; // More than ~10 per week
  if (interactionCount > 20) return 'medium'; // ~4-5 per week
  if (interactionCount > 0) return 'low'; // Less than 4 per week
  return 'inactive';
}

// ============================================================================
// HEALTH SCORE CALCULATION
// ============================================================================

/**
 * Calculate relationship health score
 * Based on: frequency, sentiment trend, engagement level, recency
 *
 * Factors:
 * - Recent positive interactions increase score
 * - Recent negative interactions decrease score
 * - Frequency of interactions
 * - Days since last interaction
 * - Sentiment trend (improving/declining)
 */
export async function updateHealthScore(contactId: string): Promise<number> {
  try {
    const contact = await getContactById(contactId);
    if (!contact) return 50;

    let score = 50; // Start at neutral

    // Factor 1: Frequency (0-30 points)
    const frequencyScore = Math.min(30, (contact.interaction_count || 0) / 5);
    score += frequencyScore;

    // Factor 2: Recency (0-20 points)
    if (contact.last_interaction_at) {
      const daysSinceLastInteraction = Math.floor(
        (new Date().getTime() - new Date(contact.last_interaction_at).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastInteraction === 0) {
        score += 20; // Interacted today
      } else if (daysSinceLastInteraction <= 7) {
        score += 15; // Interacted this week
      } else if (daysSinceLastInteraction <= 30) {
        score += 10; // Interacted this month
      } else if (daysSinceLastInteraction <= 90) {
        score += 5; // Interacted recently
      } else {
        score -= 10; // Inactive for 3+ months
      }
    }

    // Factor 3: Sentiment trend (0-20 points)
    if (contact.sentiment_trend === 'improving') {
      score += 10;
    } else if (contact.sentiment_trend === 'stable') {
      score += 5;
    } else if (contact.sentiment_trend === 'declining') {
      score -= 10;
    }

    // Factor 4: Engagement level (bonus/penalty)
    const engagementBonus =
      {
        high: 10,
        medium: 5,
        low: 0,
        inactive: -15,
      }[contact.engagement_level] || 0;
    score += engagementBonus;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Update in database
    await updateContact(contactId, { health_score: score });

    return score;
  } catch (error) {
    console.error(`Error updating health score for ${contactId}:`, error);
    return 50;
  }
}

/**
 * Batch update health scores for all contacts
 * Should be run periodically (e.g., daily)
 */
export async function updateAllHealthScores(userId: string): Promise<void> {
  try {
    const contacts = await getUserContacts(userId);

    for (const contact of contacts) {
      await updateHealthScore(contact.id);
    }

    console.log(`Updated health scores for ${contacts.length} contacts`);
  } catch (error) {
    console.error('Error updating all health scores:', error);
  }
}

// ============================================================================
// SENTIMENT TREND ANALYSIS
// ============================================================================

/**
 * Analyze sentiment trend for a contact based on recent memories
 */
export async function analyzeSentimentTrend(
  contactId: string
): Promise<'improving' | 'stable' | 'declining' | 'unknown'> {
  try {
    // Get recent memories for this contact (last 30 days)
    const { data: memories, error } = await supabase
      .from('memories')
      .select('sentiment_score, created_at')
      .eq('source_contact_id', contactId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (error || !memories || memories.length < 2) {
      return 'unknown';
    }

    // Calculate average sentiment for first and second half
    const mid = Math.floor(memories.length / 2);
    const firstHalf = memories.slice(0, mid);
    const secondHalf = memories.slice(mid);

    const avgFirstHalf =
      firstHalf.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / firstHalf.length;
    const avgSecondHalf =
      secondHalf.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / secondHalf.length;

    const diff = avgSecondHalf - avgFirstHalf;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  } catch (error) {
    console.error(`Error analyzing sentiment trend for ${contactId}:`, error);
    return 'unknown';
  }
}

// ============================================================================
// CONTACT INSIGHTS & STATISTICS
// ============================================================================

/**
 * Get comprehensive statistics about a user's contact network
 */
export async function getContactNetworkStats(userId: string): Promise<ContactNetworkStats> {
  try {
    const contacts = await getUserContacts(userId);

    const stats: ContactNetworkStats = {
      total_contacts: contacts.length,
      active_contacts: contacts.filter((c) => !c.is_archived).length,
      by_engagement: {
        high: contacts.filter((c) => c.engagement_level === 'high').length,
        medium: contacts.filter((c) => c.engagement_level === 'medium').length,
        low: contacts.filter((c) => c.engagement_level === 'low').length,
        inactive: contacts.filter((c) => c.engagement_level === 'inactive').length,
      },
      by_relationship: {},
      avg_health_score: 0,
      high_risk_contacts: [],
      inactive_contacts: [],
    };

    // Calculate by relationship type
    const relationshipTypes = new Set(contacts.map((c) => c.relationship_type));
    for (const type of relationshipTypes) {
      stats.by_relationship[type] = contacts.filter((c) => c.relationship_type === type).length;
    }

    // Calculate average health score
    const healthScores = contacts
      .map((c) => c.health_score || 50)
      .filter((score) => typeof score === 'number');
    stats.avg_health_score =
      healthScores.length > 0
        ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
        : 50;

    // Identify high-risk contacts (low health score)
    stats.high_risk_contacts = contacts
      .filter((c) => (c.health_score || 50) < 30)
      .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
      .slice(0, 5);

    // Identify inactive contacts
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    stats.inactive_contacts = contacts
      .filter((c) => !c.last_interaction_at || new Date(c.last_interaction_at) < ninetyDaysAgo)
      .slice(0, 5);

    return stats;
  } catch (error) {
    console.error('Error getting contact network stats:', error);
    return {
      total_contacts: 0,
      active_contacts: 0,
      by_engagement: { high: 0, medium: 0, low: 0, inactive: 0 },
      by_relationship: {},
      avg_health_score: 0,
      high_risk_contacts: [],
      inactive_contacts: [],
    };
  }
}

/**
 * Get contacts needing attention
 * Returns high-risk and inactive contacts with suggestions
 */
export async function getContactsNeedingAttention(
  userId: string
): Promise<
  Array<{
    contact: ContactNetwork;
    reason: 'low_health' | 'inactive' | 'declining_sentiment';
    suggestion: string;
  }>
> {
  try {
    const contacts = await getUserContacts(userId);
    const needingAttention = [];

    for (const contact of contacts) {
      let reason: 'low_health' | 'inactive' | 'declining_sentiment' | undefined;
      let suggestion = '';

      // Check health score
      if ((contact.health_score || 50) < 30) {
        reason = 'low_health';
        suggestion = `Relationship with ${contact.name} needs attention. Consider reaching out to improve the connection.`;
      }

      // Check if inactive
      if (contact.last_interaction_at) {
        const daysSinceLastInteraction = Math.floor(
          (new Date().getTime() - new Date(contact.last_interaction_at).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastInteraction > 90) {
          reason = 'inactive';
          suggestion = `You haven't talked to ${contact.name} in ${daysSinceLastInteraction} days. Time to reconnect?`;
        }
      }

      // Check sentiment trend
      if (contact.sentiment_trend === 'declining') {
        reason = 'declining_sentiment';
        suggestion = `Recent interactions with ${contact.name} have been increasingly negative. Consider having a positive conversation.`;
      }

      if (reason) {
        needingAttention.push({
          contact,
          reason,
          suggestion,
        });
      }
    }

    return needingAttention.slice(0, 10); // Top 10 contacts needing attention
  } catch (error) {
    console.error('Error getting contacts needing attention:', error);
    return [];
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Search contacts by name, email, or phone
 */
export async function searchContacts(
  userId: string,
  query: string
): Promise<ContactNetwork[]> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', userId)
      .or(
        `name.ilike.%${query}%,email.ilike.%${query}%,phone_number.ilike.%${query}%`
      );

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching contacts:', error);
    return [];
  }
}

/**
 * Get contacts by relationship type
 */
export async function getContactsByType(
  userId: string,
  relationshipType: string
): Promise<ContactNetwork[]> {
  try {
    const { data, error } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', userId)
      .eq('relationship_type', relationshipType)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching contacts by type ${relationshipType}:`, error);
    return [];
  }
}
