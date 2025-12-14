import { supabase } from '@/lib/supabase';
import type {
  GroupFund,
  CreateFundPayload,
  UpdateFundPayload,
  FundContribution,
  CreateContributionPayload,
  ConfirmContributionPayload,
} from '../types';

export const fundService = {
  // ============= FUNDS =============

  // Get all funds for a space
  async getFunds(spaceId: string): Promise<GroupFund[]> {
    const { data, error } = await supabase
      .from('tribo_group_funds')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformFundFromDB);
  },

  // Get active funds
  async getActiveFunds(spaceId: string): Promise<GroupFund[]> {
    const { data, error } = await supabase
      .from('tribo_group_funds')
      .select('*')
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .order('deadline', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []).map(transformFundFromDB);
  },

  // Get single fund with contributions
  async getFund(fundId: string): Promise<GroupFund> {
    const { data, error } = await supabase
      .from('tribo_group_funds')
      .select(
        `
        *,
        contributions:tribo_fund_contributions(
          *,
          member:connection_members(
            id,
            user_id,
            display_name,
            avatar_url
          )
        )
      `
      )
      .eq('id', fundId)
      .single();

    if (error) throw error;

    return transformFundFromDB(data, data.contributions);
  },

  // Create fund
  async createFund(payload: CreateFundPayload): Promise<GroupFund> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tribo_group_funds')
      .insert({
        space_id: payload.spaceId,
        title: payload.title,
        description: payload.description,
        purpose: payload.purpose,
        target_amount: payload.targetAmount,
        deadline: payload.deadline,
        contribution_type: payload.contributionType || 'voluntary',
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return transformFundFromDB(data);
  },

  // Update fund
  async updateFund(fundId: string, payload: UpdateFundPayload): Promise<GroupFund> {
    const updateData: any = {};

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.purpose !== undefined) updateData.purpose = payload.purpose;
    if (payload.targetAmount !== undefined) updateData.target_amount = payload.targetAmount;
    if (payload.deadline !== undefined) updateData.deadline = payload.deadline;
    if (payload.contributionType !== undefined)
      updateData.contribution_type = payload.contributionType;
    if (payload.status !== undefined) {
      updateData.status = payload.status;
      if (payload.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('tribo_group_funds')
      .update(updateData)
      .eq('id', fundId)
      .select()
      .single();

    if (error) throw error;

    return transformFundFromDB(data);
  },

  // Delete fund
  async deleteFund(fundId: string): Promise<void> {
    const { error } = await supabase.from('tribo_group_funds').delete().eq('id', fundId);

    if (error) throw error;
  },

  // ============= CONTRIBUTIONS =============

  // Get contributions for a fund
  async getContributions(fundId: string): Promise<FundContribution[]> {
    const { data, error } = await supabase
      .from('tribo_fund_contributions')
      .select(
        `
        *,
        member:connection_members(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('fund_id', fundId)
      .order('contributed_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformContributionFromDB);
  },

  // Get contributions by member
  async getMemberContributions(memberId: string): Promise<FundContribution[]> {
    const { data, error } = await supabase
      .from('tribo_fund_contributions')
      .select('*')
      .eq('member_id', memberId)
      .order('contributed_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformContributionFromDB);
  },

  // Create contribution
  async createContribution(
    payload: CreateContributionPayload
  ): Promise<FundContribution> {
    const { data, error } = await supabase
      .from('tribo_fund_contributions')
      .insert({
        fund_id: payload.fundId,
        member_id: payload.memberId,
        amount: payload.amount,
        payment_method: payload.paymentMethod,
        notes: payload.notes,
      })
      .select(
        `
        *,
        member:connection_members(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) throw error;

    return transformContributionFromDB(data);
  },

  // Confirm contribution
  async confirmContribution(
    payload: ConfirmContributionPayload
  ): Promise<FundContribution> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tribo_fund_contributions')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: userData.user.id,
        transaction_id: payload.transactionId,
      })
      .eq('id', payload.contributionId)
      .select(
        `
        *,
        member:connection_members(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) throw error;

    return transformContributionFromDB(data);
  },

  // Delete contribution
  async deleteContribution(contributionId: string): Promise<void> {
    const { error } = await supabase
      .from('tribo_fund_contributions')
      .delete()
      .eq('id', contributionId);

    if (error) throw error;
  },

  // Get fund statistics
  async getFundStats(fundId: string): Promise<{
    totalContributions: number;
    confirmedAmount: number;
    pendingAmount: number;
    contributorCount: number;
    averageContribution: number;
  }> {
    const contributions = await this.getContributions(fundId);

    const confirmedContributions = contributions.filter((c) => c.isConfirmed);
    const pendingContributions = contributions.filter((c) => !c.isConfirmed);

    const totalContributions = contributions.length;
    const confirmedAmount = confirmedContributions.reduce((sum, c) => sum + c.amount, 0);
    const pendingAmount = pendingContributions.reduce((sum, c) => sum + c.amount, 0);
    const contributorCount = new Set(contributions.map((c) => c.memberId)).size;
    const averageContribution =
      totalContributions > 0 ? confirmedAmount / totalContributions : 0;

    return {
      totalContributions,
      confirmedAmount,
      pendingAmount,
      contributorCount,
      averageContribution,
    };
  },
};

// ============= TRANSFORMERS =============

function transformFundFromDB(data: any, contributions?: any[]): GroupFund {
  const fund: GroupFund = {
    id: data.id,
    spaceId: data.space_id,
    title: data.title,
    description: data.description,
    purpose: data.purpose,
    targetAmount: parseFloat(data.target_amount),
    deadline: data.deadline,
    currentAmount: parseFloat(data.current_amount || 0),
    contributionType: data.contribution_type,
    status: data.status,
    completedAt: data.completed_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  // Calculate progress
  fund.progress =
    fund.targetAmount > 0 ? (fund.currentAmount / fund.targetAmount) * 100 : 0;

  // Calculate days remaining
  if (fund.deadline) {
    const deadline = new Date(fund.deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    fund.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Add contributions if provided
  if (contributions) {
    fund.contributions = contributions.map(transformContributionFromDB);
    fund.contributorCount = new Set(contributions.map((c) => c.member_id)).size;
  }

  return fund;
}

function transformContributionFromDB(data: any): FundContribution {
  return {
    id: data.id,
    fundId: data.fund_id,
    memberId: data.member_id,
    amount: parseFloat(data.amount),
    contributedAt: data.contributed_at,
    isConfirmed: data.is_confirmed,
    confirmedAt: data.confirmed_at,
    confirmedBy: data.confirmed_by,
    paymentMethod: data.payment_method,
    transactionId: data.transaction_id,
    notes: data.notes,
    createdAt: data.created_at,
    member: data.member
      ? {
          id: data.member.id,
          userId: data.member.user_id,
          displayName: data.member.display_name,
          avatarUrl: data.member.avatar_url,
        }
      : undefined,
  };
}
