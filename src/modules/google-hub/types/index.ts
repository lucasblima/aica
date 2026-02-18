/**
 * Google Hub Intelligence Layer — Types
 *
 * Types for email categorization, task extraction, and contact enrichment.
 */

export type EmailCategory = 'actionable' | 'informational' | 'newsletter' | 'receipt' | 'personal' | 'notification';

export interface CategorizedEmail {
  id: string;
  user_id: string;
  message_id: string;
  category: EmailCategory;
  confidence: number;
  extracted_tasks: ExtractedTaskPreview[];
  extracted_contacts: ExtractedContact[];
  processed_at: string;
}

export interface ExtractedTask {
  id: string;
  source_message_id: string;
  source_subject: string | null;
  source_sender: string | null;
  task_description: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'dismissed';
  work_item_id: string | null;
  created_at: string;
}

export interface ExtractedTaskPreview {
  task_description: string;
  due_date?: string;
  priority?: string;
}

export interface ExtractedContact {
  email: string;
  name?: string;
}

export interface ContactEnrichment {
  frequency: string;
  topics: string[];
  sentiment: string;
  last_interaction: string;
  relationship_type: string;
}

export interface EmailCategoryConfig {
  label: string;
  icon: string;
  color: string;
}
