import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('InvitationService');

/**
 * Invitation Service
 *
 * Handles member invitations to connection spaces.
 * Supports email invitations, invite links, expiration tracking, and acceptance/rejection flows.
 */

export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type EmailDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';

export interface Invitation {
  id: string;
  space_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  invited_by: string; // user_id
  role: 'owner' | 'admin' | 'member' | 'guest';
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  rejected_at?: string;
  // Email tracking fields
  email_sent_at?: string;
  email_delivery_status?: EmailDeliveryStatus;
  email_delivery_error?: string;
}

export interface InviteResult {
  success: boolean;
  invitation?: Invitation;
  inviteLink?: string;
  error?: string;
}

/**
 * Generates a secure random token for invitation links
 */
function generateToken(): string {
  // Use crypto.randomUUID() for secure token generation
  // Remove hyphens for a cleaner token
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Generates an invite link from a token
 * Uses the current app base URL with the invite route
 */
export function generateInviteLink(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/invite/${token}`;
}

/**
 * Checks if an invitation has expired
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  const expiresAt = new Date(invitation.expires_at);
  const now = new Date();
  return now > expiresAt;
}

/**
 * Sends invitation email via Edge Function
 *
 * @param invitationId - The ID of the invitation
 * @param email - Invitee email address
 * @param inviterName - Name of the person sending the invite
 * @param spaceName - Name of the connection space
 * @param spaceArchetype - Type of space (habitat, ventures, academia, tribo)
 * @param token - Invitation token
 */
async function sendInvitationEmail(
  invitationId: string,
  email: string,
  inviterName: string,
  spaceName: string,
  spaceArchetype: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'User not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invitation_id: invitationId,
          to_email: email,
          inviter_name: inviterName,
          space_name: spaceName,
          space_archetype: spaceArchetype,
          token,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      log.error('Edge Function error:', result);
      return {
        success: false,
        error: result.error || 'Failed to send invitation email',
      };
    }

    return { success: true };
  } catch (error) {
    log.error('Error calling send-invitation-email Edge Function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a new invitation for a connection space
 *
 * @param spaceId - The ID of the connection space
 * @param email - Email address of the invitee
 * @param invitedBy - User ID of the person sending the invite
 * @param role - Role to assign (defaults to 'member')
 * @param expiresInDays - Number of days until expiration (defaults to 7)
 * @returns InviteResult with invitation details and invite link
 */
export async function createInvitation(
  spaceId: string,
  email: string,
  invitedBy: string,
  role: 'owner' | 'admin' | 'member' | 'guest' = 'member',
  expiresInDays: number = 7
): Promise<InviteResult> {
  try {
    // Validate inputs
    if (!spaceId || !email || !invitedBy) {
      return {
        success: false,
        error: 'Missing required fields: spaceId, email, or invitedBy'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    // Check if user is authorized to invite to this space
    const { data: spaceData, error: spaceError } = await supabase
      .from('connection_spaces')
      .select('id, owner_id, name, archetype')
      .eq('id', spaceId)
      .single();

    if (spaceError || !spaceData) {
      return {
        success: false,
        error: 'Space not found or you do not have permission to invite members'
      };
    }

    // Verify user owns the space or is admin
    const { data: memberData } = await supabase
      .from('connection_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', invitedBy)
      .eq('is_active', true)
      .single();

    const isOwner = spaceData.owner_id === invitedBy;
    const isAdmin = memberData?.role === 'admin' || memberData?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: 'You do not have permission to invite members to this space'
      };
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvites } = await supabase
      .from('connection_invitations')
      .select('*')
      .eq('space_id', spaceId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending');

    if (existingInvites && existingInvites.length > 0) {
      const activeInvite = existingInvites.find((inv: Invitation) => !isInvitationExpired(inv));
      if (activeInvite) {
        return {
          success: false,
          error: 'An active invitation already exists for this email'
        };
      }
    }

    // Generate unique token
    const token = generateToken();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation record
    const invitationPayload = {
      space_id: spaceId,
      email: email.toLowerCase(),
      token,
      status: 'pending' as InviteStatus,
      invited_by: invitedBy,
      role,
      expires_at: expiresAt.toISOString(),
      email_delivery_status: 'pending' as EmailDeliveryStatus,
    };

    const { data: invitationData, error: invitationError } = await supabase
      .from('connection_invitations')
      .insert(invitationPayload)
      .select()
      .single();

    if (invitationError) {
      log.error('Error creating invitation:', invitationError);
      return {
        success: false,
        error: `Failed to create invitation: ${invitationError.message}`
      };
    }

    const invitation = invitationData as Invitation;
    const inviteLink = generateInviteLink(token);

    // Get inviter name for email
    const { data: userData } = await supabase.auth.getUser();
    const inviterName = userData?.user?.user_metadata?.full_name ||
                       userData?.user?.email?.split('@')[0] ||
                       'Um membro';

    // Send invitation email via Edge Function
    const emailResult = await sendInvitationEmail(
      invitation.id,
      email,
      inviterName,
      spaceData.name,
      spaceData.archetype,
      token
    );

    if (!emailResult.success) {
      log.warn('Failed to send invitation email:', emailResult.error);
      // Don't fail the entire operation if email fails
      // Invitation is still created, email can be retried
    }

    return {
      success: true,
      invitation,
      inviteLink
    };
  } catch (error) {
    log.error('Error in createInvitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Retrieves an invitation by its unique token
 *
 * @param token - The invitation token
 * @returns Invitation object or null if not found
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    if (!token) {
      return null;
    }

    const { data, error } = await supabase
      .from('connection_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error) {
      log.error('Error fetching invitation by token:', error);
      return null;
    }

    return data as Invitation;
  } catch (error) {
    log.error('Error in getInvitationByToken:', error);
    return null;
  }
}

/**
 * Accepts an invitation and adds the user to the connection space
 *
 * @param token - The invitation token
 * @param userId - The ID of the user accepting the invitation
 * @returns InviteResult indicating success or failure
 */
export async function acceptInvitation(token: string, userId: string): Promise<InviteResult> {
  try {
    // Fetch the invitation
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return {
        success: false,
        error: 'Invitation not found'
      };
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return {
        success: false,
        error: 'Invitation has already been accepted'
      };
    }

    // Check if rejected
    if (invitation.status === 'rejected') {
      return {
        success: false,
        error: 'Invitation has been rejected and cannot be accepted'
      };
    }

    // Check if expired
    if (isInvitationExpired(invitation)) {
      // Update status to expired
      await supabase
        .from('connection_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return {
        success: false,
        error: 'Invitation has expired'
      };
    }

    // Verify user email matches invitation email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== invitation.email) {
      return {
        success: false,
        error: 'This invitation is not for your email address'
      };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('connection_members')
      .select('id')
      .eq('space_id', invitation.space_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (existingMember) {
      // Update invitation status but don't fail
      await supabase
        .from('connection_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      return {
        success: true,
        invitation,
        error: 'You are already a member of this space'
      };
    }

    // Add user as member to the space
    const memberPayload = {
      space_id: invitation.space_id,
      user_id: userId,
      role: invitation.role,
      is_active: true,
      joined_at: new Date().toISOString()
    };

    const { error: memberError } = await supabase
      .from('connection_members')
      .insert(memberPayload);

    if (memberError) {
      log.error('Error adding member:', memberError);
      return {
        success: false,
        error: `Failed to add member: ${memberError.message}`
      };
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('connection_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)
      .select()
      .single();

    if (updateError) {
      log.error('Error updating invitation status:', updateError);
      // Don't fail since member was added successfully
    }

    return {
      success: true,
      invitation: updatedInvitation as Invitation || invitation
    };
  } catch (error) {
    log.error('Error in acceptInvitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Rejects an invitation
 *
 * @param token - The invitation token
 * @returns InviteResult indicating success or failure
 */
export async function rejectInvitation(token: string): Promise<InviteResult> {
  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return {
        success: false,
        error: 'Invitation not found'
      };
    }

    if (invitation.status === 'accepted') {
      return {
        success: false,
        error: 'Cannot reject an invitation that has already been accepted'
      };
    }

    if (invitation.status === 'rejected') {
      return {
        success: true,
        invitation,
        error: 'Invitation has already been rejected'
      };
    }

    const { data: updatedInvitation, error } = await supabase
      .from('connection_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitation.id)
      .select()
      .single();

    if (error) {
      log.error('Error rejecting invitation:', error);
      return {
        success: false,
        error: `Failed to reject invitation: ${error.message}`
      };
    }

    return {
      success: true,
      invitation: updatedInvitation as Invitation
    };
  } catch (error) {
    log.error('Error in rejectInvitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Gets all invitations for a specific space
 * Only the space owner can view invitations
 *
 * @param spaceId - The ID of the connection space
 * @returns Array of invitations
 */
export async function getSpaceInvitations(spaceId: string): Promise<Invitation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verify user owns the space
    const { data: spaceData } = await supabase
      .from('connection_spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (!spaceData) {
      throw new Error('Space not found or you do not have permission to view invitations');
    }

    const { data, error } = await supabase
      .from('connection_invitations')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching space invitations:', error);
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    return data as Invitation[];
  } catch (error) {
    log.error('Error in getSpaceInvitations:', error);
    throw error;
  }
}

/**
 * Cancels a pending invitation
 * Only the space owner can cancel invitations
 *
 * @param invitationId - The ID of the invitation to cancel
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch invitation to verify ownership
    const { data: invitation, error: fetchError } = await supabase
      .from('connection_invitations')
      .select('*, connection_spaces!inner(owner_id)')
      .eq('id', invitationId)
      .single();

    if (fetchError) {
      log.error('Error fetching invitation:', fetchError);
      throw new Error(`Failed to fetch invitation: ${fetchError.message}`);
    }

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify user owns the space
    const space = invitation.connection_spaces as any;
    if (space.owner_id !== user.id) {
      throw new Error('You do not have permission to cancel this invitation');
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('connection_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      log.error('Error canceling invitation:', deleteError);
      throw new Error(`Failed to cancel invitation: ${deleteError.message}`);
    }
  } catch (error) {
    log.error('Error in cancelInvitation:', error);
    throw error;
  }
}

/**
 * Resends an invitation by creating a new token and extending expiration
 * The old invitation is cancelled and a new one is created
 *
 * @param invitationId - The ID of the invitation to resend
 * @returns InviteResult with new invitation details
 */
export async function resendInvitation(invitationId: string): Promise<InviteResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Fetch the original invitation with space details
    const { data: originalInvitation, error: fetchError } = await supabase
      .from('connection_invitations')
      .select('*, connection_spaces!inner(owner_id, name, archetype)')
      .eq('id', invitationId)
      .single();

    if (fetchError || !originalInvitation) {
      return {
        success: false,
        error: 'Invitation not found'
      };
    }

    // Verify user owns the space or is admin
    const space = originalInvitation.connection_spaces as any;
    const isOwner = space.owner_id === user.id;

    const { data: memberData } = await supabase
      .from('connection_members')
      .select('role')
      .eq('space_id', originalInvitation.space_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isAdmin = memberData?.role === 'admin' || memberData?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: 'You do not have permission to resend this invitation'
      };
    }

    // Cancel the old invitation
    await cancelInvitation(invitationId);

    // Create a new invitation with the same parameters
    // This will automatically send the email via createInvitation
    return await createInvitation(
      originalInvitation.space_id,
      originalInvitation.email,
      user.id,
      originalInvitation.role,
      7 // Reset to 7 days expiration
    );
  } catch (error) {
    log.error('Error in resendInvitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
