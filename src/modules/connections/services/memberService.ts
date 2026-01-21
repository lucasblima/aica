import { supabase } from '@/lib/supabase';
import { ConnectionMember, AddMemberPayload, MemberRole } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('MemberService');

/**
 * Member Service
 *
 * Handles all CRUD operations and business logic for Connection Members.
 * Members can be either registered users or external contacts.
 */
export const memberService = {
  /**
   * Lists all active members of a specific space.
   * Ordered by: role (owner -> admin -> member -> guest), then by join date.
   *
   * @param spaceId - The unique identifier of the connection space
   * @returns Promise resolving to an array of ConnectionMember objects
   * @throws {Error} If the database query fails
   *
   * @example
   * const members = await memberService.getMembers('space-123');
   * console.log(`Space has ${members.length} members`);
   */
  async getMembers(spaceId: string): Promise<ConnectionMember[]> {
    try {
      const { data, error } = await supabase
        .from('connection_members')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_active', true)
        .order('role')
        .order('joined_at', { ascending: false });

      if (error) {
        log.error('Error fetching members:', { error, spaceId });
        throw new Error(`Failed to fetch members: ${error.message}`);
      }

      return data as ConnectionMember[];
    } catch (error) {
      log.error('Error in getMembers:', { error });
      throw error;
    }
  },

  /**
   * Fetches a single member by ID.
   *
   * @param id - The unique identifier of the member
   * @returns Promise resolving to a ConnectionMember object
   * @throws {Error} If member is not found or query fails
   *
   * @example
   * const member = await memberService.getMemberById('member-123');
   * console.log(`Member: ${member.external_name || 'Registered User'}`);
   */
  async getMemberById(id: string): Promise<ConnectionMember> {
    try {
      const { data, error } = await supabase
        .from('connection_members')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        log.error('Error fetching member:', { error, id });
        throw new Error(`Failed to fetch member: ${error.message}`);
      }

      if (!data) {
        throw new Error('Member not found');
      }

      return data as ConnectionMember;
    } catch (error) {
      log.error('Error in getMemberById:', { error });
      throw error;
    }
  },

  /**
   * Adds a new member to a connection space.
   * Members can be either registered users (user_id) or external contacts (external_* fields).
   * Requires admin or owner permissions.
   *
   * @param spaceId - The unique identifier of the connection space
   * @param data - Member creation payload
   * @param data.user_id - ID of registered user (optional, mutually exclusive with external_name)
   * @param data.external_name - Name of external contact (optional, mutually exclusive with user_id)
   * @param data.external_email - Email of external contact (optional)
   * @param data.external_phone - Phone of external contact (optional)
   * @param data.role - Member role: owner, admin, member, viewer (defaults to member)
   * @param data.context_label - Optional context-specific label
   * @param data.context_data - Optional context-specific metadata
   * @returns Promise resolving to the created ConnectionMember
   * @throws {Error} If user is not authenticated
   * @throws {Error} If user lacks permission to add members
   * @throws {Error} If neither user_id nor external_name is provided
   *
   * @example
   * // Add a registered user
   * const member = await memberService.addMember('space-123', {
   *   user_id: 'user-456',
   *   role: 'admin'
   * });
   *
   * @example
   * // Add an external contact
   * const external = await memberService.addMember('space-123', {
   *   external_name: 'John Doe',
   *   external_email: 'john@example.com',
   *   role: 'member'
   * });
   */
  async addMember(spaceId: string, data: AddMemberPayload): Promise<ConnectionMember> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify that the current user is admin/owner of the space
      const isAdmin = await this.isAdmin(spaceId);
      if (!isAdmin) {
        throw new Error('You do not have permission to add members to this space');
      }

      // Validate that either user_id or external_name is provided
      if (!data.user_id && !data.external_name) {
        throw new Error('Either user_id or external_name must be provided');
      }

      const memberPayload = {
        space_id: spaceId,
        user_id: data.user_id,
        external_name: data.external_name,
        external_email: data.external_email,
        external_phone: data.external_phone,
        role: data.role || 'member',
        permissions: {},
        context_label: data.context_label,
        context_data: data.context_data || {},
        is_active: true,
        joined_at: new Date().toISOString()
      };

      const { data: memberData, error } = await supabase
        .from('connection_members')
        .insert(memberPayload)
        .select()
        .single();

      if (error) {
        log.error('Error adding member:', { error, spaceId, data });
        throw new Error(`Failed to add member: ${error.message}`);
      }

      return memberData as ConnectionMember;
    } catch (error) {
      log.error('Error in addMember:', { error });
      throw error;
    }
  },

  /**
   * Updates a member's information, role, or permissions.
   * Requires admin or owner permissions.
   *
   * @param id - The unique identifier of the member to update
   * @param data - Partial update payload with fields to modify
   * @returns Promise resolving to the updated ConnectionMember
   * @throws {Error} If user is not authenticated
   * @throws {Error} If user lacks permission to update members
   * @throws {Error} If member is not found
   *
   * @example
   * const updated = await memberService.updateMember('member-123', {
   *   role: 'admin',
   *   context_label: 'Co-founder'
   * });
   */
  async updateMember(id: string, data: Partial<AddMemberPayload>): Promise<ConnectionMember> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the member to verify space ownership
      const member = await this.getMemberById(id);
      const isAdmin = await this.isAdmin(member.space_id);

      if (!isAdmin) {
        throw new Error('You do not have permission to update this member');
      }

      const updatePayload = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: memberData, error } = await supabase
        .from('connection_members')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating member:', { error, id, data });
        throw new Error(`Failed to update member: ${error.message}`);
      }

      if (!memberData) {
        throw new Error('Member not found');
      }

      return memberData as ConnectionMember;
    } catch (error) {
      log.error('Error in updateMember:', { error });
      throw error;
    }
  },

  /**
   * Soft deletes a member by setting is_active to false.
   * The member record remains in the database but is hidden from queries.
   * Cannot remove space owners. Requires admin or owner permissions.
   *
   * @param id - The unique identifier of the member to remove
   * @returns Promise that resolves when removal is complete
   * @throws {Error} If user is not authenticated
   * @throws {Error} If user lacks permission to remove members
   * @throws {Error} If attempting to remove the space owner
   *
   * @example
   * await memberService.removeMember('member-123');
   * console.log('Member removed from space');
   */
  async removeMember(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the member to verify space ownership
      const member = await this.getMemberById(id);
      const isAdmin = await this.isAdmin(member.space_id);

      if (!isAdmin) {
        throw new Error('You do not have permission to remove this member');
      }

      // Prevent removing the owner
      if (member.role === 'owner') {
        throw new Error('Cannot remove the space owner');
      }

      const { error } = await supabase
        .from('connection_members')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        log.error('Error removing member:', { error, id });
        throw new Error(`Failed to remove member: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in removeMember:', { error });
      throw error;
    }
  },

  /**
   * Updates a member's role.
   * Cannot change owner's role or assign owner role to another member.
   * Requires admin or owner permissions.
   *
   * @param id - The unique identifier of the member
   * @param role - New role to assign (admin, member, viewer)
   * @returns Promise resolving to the updated ConnectionMember
   * @throws {Error} If user is not authenticated
   * @throws {Error} If user lacks permission to change roles
   * @throws {Error} If attempting to change owner's role
   * @throws {Error} If attempting to assign owner role
   *
   * @example
   * const promoted = await memberService.updateRole('member-123', 'admin');
   * const demoted = await memberService.updateRole('member-456', 'member');
   */
  async updateRole(id: string, role: MemberRole): Promise<ConnectionMember> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the member to verify space ownership
      const member = await this.getMemberById(id);
      const isAdmin = await this.isAdmin(member.space_id);

      if (!isAdmin) {
        throw new Error('You do not have permission to change member roles');
      }

      // Prevent changing the owner's role
      if (member.role === 'owner') {
        throw new Error('Cannot change the owner\'s role');
      }

      // Prevent setting role to owner
      if (role === 'owner') {
        throw new Error('Cannot assign owner role. Transfer ownership is not supported yet.');
      }

      const { data: memberData, error } = await supabase
        .from('connection_members')
        .update({
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating role:', { error, id, role });
        throw new Error(`Failed to update role: ${error.message}`);
      }

      if (!memberData) {
        throw new Error('Member not found');
      }

      return memberData as ConnectionMember;
    } catch (error) {
      log.error('Error in updateRole:', { error });
      throw error;
    }
  },

  /**
   * Checks if the current user is an admin or owner of a space.
   * Returns true if the user is the space owner OR a member with admin/owner role.
   *
   * @param spaceId - The unique identifier of the connection space
   * @returns Promise resolving to true if user has admin privileges, false otherwise
   *
   * @example
   * const canManage = await memberService.isAdmin('space-123');
   * if (canManage) {
   *   console.log('User can manage this space');
   * }
   */
  async isAdmin(spaceId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return false;
      }

      // Check if user is the space owner
      const { data: space, error: spaceError } = await supabase
        .from('connection_spaces')
        .select('owner_id')
        .eq('id', spaceId)
        .single();

      if (spaceError) {
        log.error('Error checking space ownership:', { error: spaceError, spaceId });
        return false;
      }

      if (space && space.owner_id === user.id) {
        return true;
      }

      // Check if user is a member with admin role
      const { data: member, error: memberError } = await supabase
        .from('connection_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (memberError) {
        // Member not found is not an error for this check
        return false;
      }

      return member ? (member.role === 'owner' || member.role === 'admin') : false;
    } catch (error) {
      log.error('Error in isAdmin:', { error });
      return false;
    }
  },
};
