/**
 * Inventory AI Suggest Service — calls suggest-inventory-items Edge Function
 */
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('InventorySuggestService');

export interface MissingItemSuggestion {
  name: string;
  category: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ReplaceItemSuggestion {
  current_item: string;
  reason: string;
  suggestion: string;
}

export interface OrganizationTip {
  tip: string;
  affected_items: string[];
}

export interface InventorySuggestions {
  missing_items: MissingItemSuggestion[];
  replace_items: ReplaceItemSuggestion[];
  organization_tips: OrganizationTip[];
}

export class InventorySuggestService {
  static async getSuggestions(personaId: string): Promise<{
    success: boolean;
    data?: InventorySuggestions;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('suggest-inventory-items', {
        body: { persona_id: personaId },
      });

      if (error) {
        log.error('Edge function error', { error });
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' };
      }

      return { success: true, data: data.data as InventorySuggestions };
    } catch (err) {
      log.error('getSuggestions failed', { err });
      return { success: false, error: (err as Error).message };
    }
  }
}
