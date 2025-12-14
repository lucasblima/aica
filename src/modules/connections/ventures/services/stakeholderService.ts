import { supabase } from '@/lib/supabase';
import type {
  VenturesStakeholder,
  CreateStakeholderPayload,
  UpdateStakeholderPayload,
  StakeholderType,
} from '../types';

/**
 * Stakeholder Service
 *
 * Handles all CRUD operations for Ventures stakeholders (founders, investors, employees).
 */
export const stakeholderService = {
  /**
   * Get all stakeholders for a specific entity
   */
  async getStakeholdersByEntity(entityId: string): Promise<VenturesStakeholder[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .select('*')
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('stakeholder_type')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stakeholders:', error);
        throw new Error(`Failed to fetch stakeholders: ${error.message}`);
      }

      return data as VenturesStakeholder[];
    } catch (error) {
      console.error('Error in getStakeholdersByEntity:', error);
      throw error;
    }
  },

  /**
   * Get stakeholders filtered by type
   */
  async getStakeholdersByType(
    entityId: string,
    type: StakeholderType
  ): Promise<VenturesStakeholder[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .select('*')
        .eq('entity_id', entityId)
        .eq('stakeholder_type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stakeholders by type:', error);
        throw new Error(`Failed to fetch stakeholders: ${error.message}`);
      }

      return data as VenturesStakeholder[];
    } catch (error) {
      console.error('Error in getStakeholdersByType:', error);
      throw error;
    }
  },

  /**
   * Get founders (founder + co-founder)
   */
  async getFounders(entityId: string): Promise<VenturesStakeholder[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .select('*')
        .eq('entity_id', entityId)
        .in('stakeholder_type', ['founder', 'co-founder'])
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching founders:', error);
        throw new Error(`Failed to fetch founders: ${error.message}`);
      }

      return data as VenturesStakeholder[];
    } catch (error) {
      console.error('Error in getFounders:', error);
      throw error;
    }
  },

  /**
   * Get investors
   */
  async getInvestors(entityId: string): Promise<VenturesStakeholder[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .select('*')
        .eq('entity_id', entityId)
        .eq('stakeholder_type', 'investor')
        .eq('is_active', true)
        .order('investment_date', { ascending: false, nullsFirst: false })
        .order('investment_amount', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching investors:', error);
        throw new Error(`Failed to fetch investors: ${error.message}`);
      }

      return data as VenturesStakeholder[];
    } catch (error) {
      console.error('Error in getInvestors:', error);
      throw error;
    }
  },

  /**
   * Get team members (employees + contractors)
   */
  async getTeamMembers(entityId: string): Promise<VenturesStakeholder[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .select('*')
        .eq('entity_id', entityId)
        .in('stakeholder_type', ['employee', 'contractor'])
        .eq('is_active', true)
        .order('start_date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching team members:', error);
        throw new Error(`Failed to fetch team members: ${error.message}`);
      }

      return data as VenturesStakeholder[];
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      throw error;
    }
  },

  /**
   * Get a single stakeholder by ID
   */
  async getStakeholderById(stakeholderId: string): Promise<VenturesStakeholder> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .select('*')
        .eq('id', stakeholderId)
        .single();

      if (error) {
        console.error('Error fetching stakeholder:', error);
        throw new Error(`Failed to fetch stakeholder: ${error.message}`);
      }

      if (!data) {
        throw new Error('Stakeholder not found');
      }

      return data as VenturesStakeholder;
    } catch (error) {
      console.error('Error in getStakeholderById:', error);
      throw error;
    }
  },

  /**
   * Create a new stakeholder
   */
  async createStakeholder(
    payload: CreateStakeholderPayload
  ): Promise<VenturesStakeholder> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .insert({
          ...payload,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating stakeholder:', error);
        throw new Error(`Failed to create stakeholder: ${error.message}`);
      }

      return data as VenturesStakeholder;
    } catch (error) {
      console.error('Error in createStakeholder:', error);
      throw error;
    }
  },

  /**
   * Update an existing stakeholder
   */
  async updateStakeholder(
    stakeholderId: string,
    payload: UpdateStakeholderPayload
  ): Promise<VenturesStakeholder> {
    try {
      const { data, error } = await supabase
        .from('ventures_stakeholders')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stakeholderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating stakeholder:', error);
        throw new Error(`Failed to update stakeholder: ${error.message}`);
      }

      if (!data) {
        throw new Error('Stakeholder not found');
      }

      return data as VenturesStakeholder;
    } catch (error) {
      console.error('Error in updateStakeholder:', error);
      throw error;
    }
  },

  /**
   * Soft delete a stakeholder (set is_active to false)
   */
  async deleteStakeholder(stakeholderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ventures_stakeholders')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stakeholderId);

      if (error) {
        console.error('Error deleting stakeholder:', error);
        throw new Error(`Failed to delete stakeholder: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteStakeholder:', error);
      throw error;
    }
  },

  /**
   * Calculate total equity distribution
   */
  async getEquityDistribution(entityId: string): Promise<{
    totalAllocated: number;
    remaining: number;
    stakeholders: Array<{
      id: string;
      name: string;
      type: StakeholderType;
      equity: number;
    }>;
  }> {
    try {
      const stakeholders = await this.getStakeholdersByEntity(entityId);

      const totalAllocated = stakeholders.reduce(
        (sum, s) => sum + (s.equity_pct || 0),
        0
      );

      const stakeholderEquity = stakeholders
        .filter((s) => s.equity_pct && s.equity_pct > 0)
        .map((s) => ({
          id: s.id,
          name: s.role_title || s.stakeholder_type,
          type: s.stakeholder_type,
          equity: s.equity_pct || 0,
        }))
        .sort((a, b) => b.equity - a.equity);

      return {
        totalAllocated,
        remaining: Math.max(0, 100 - totalAllocated),
        stakeholders: stakeholderEquity,
      };
    } catch (error) {
      console.error('Error calculating equity distribution:', error);
      throw error;
    }
  },

  /**
   * Calculate total capital raised
   */
  async getTotalCapitalRaised(entityId: string): Promise<{
    total: number;
    byRound: Record<string, number>;
  }> {
    try {
      const investors = await this.getInvestors(entityId);

      const total = investors.reduce(
        (sum, inv) => sum + (inv.investment_amount || 0),
        0
      );

      const byRound: Record<string, number> = {};
      investors.forEach((inv) => {
        if (inv.investment_round && inv.investment_amount) {
          byRound[inv.investment_round] =
            (byRound[inv.investment_round] || 0) + inv.investment_amount;
        }
      });

      return { total, byRound };
    } catch (error) {
      console.error('Error calculating capital raised:', error);
      throw error;
    }
  },
};
