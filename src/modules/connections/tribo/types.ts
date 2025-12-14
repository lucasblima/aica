// =====================================================
// TRIBO ARCHETYPE - Types
// "Tecido Social" - Community & Group Coordination
// =====================================================

// ============= RITUALS =============

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface TriboRitual {
  id: string;
  spaceId: string;
  name: string;
  description?: string;
  recurrenceRule: string; // iCal RRULE format
  defaultTime?: string; // HH:MM format
  defaultDurationMinutes?: number;
  defaultLocation?: string;
  isMandatory: boolean;
  typicalAttendance?: number;
  isActive: boolean;
  nextOccurrenceAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRitualPayload {
  spaceId: string;
  name: string;
  description?: string;
  recurrenceRule: string;
  defaultTime?: string;
  defaultDurationMinutes?: number;
  defaultLocation?: string;
  isMandatory?: boolean;
  typicalAttendance?: number;
}

export interface UpdateRitualPayload {
  name?: string;
  description?: string;
  recurrenceRule?: string;
  defaultTime?: string;
  defaultDurationMinutes?: number;
  defaultLocation?: string;
  isMandatory?: boolean;
  typicalAttendance?: number;
  isActive?: boolean;
}

// ============= RITUAL OCCURRENCES =============

export type RSVPStatus = 'yes' | 'no' | 'maybe';
export type OccurrenceStatus = 'scheduled' | 'completed' | 'cancelled';

export interface BringListItem {
  id: string;
  item: string;
  assignedTo?: string; // member_id
  completed: boolean;
}

export interface RitualOccurrence {
  id: string;
  ritualId: string;
  eventId?: string;
  occurrenceDate: string;
  location?: string;
  notes?: string;
  bringList: BringListItem[];
  rsvpData: Record<string, RSVPStatus>; // {member_id: status}
  status: OccurrenceStatus;
  actualAttendance?: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  ritual?: TriboRitual;
}

export interface CreateOccurrencePayload {
  ritualId: string;
  occurrenceDate: string;
  location?: string;
  notes?: string;
}

export interface UpdateOccurrencePayload {
  location?: string;
  notes?: string;
  bringList?: BringListItem[];
  status?: OccurrenceStatus;
  actualAttendance?: number;
}

export interface RSVPPayload {
  occurrenceId: string;
  memberId: string;
  status: RSVPStatus;
}

// ============= SHARED RESOURCES =============

export type ResourceCategory = 'equipment' | 'space' | 'vehicle' | 'other';

export interface SharedResource {
  id: string;
  spaceId: string;
  name: string;
  description?: string;
  category: ResourceCategory;
  isAvailable: boolean;
  currentHolderId?: string;
  checkedOutAt?: string;
  returnDate?: string;
  estimatedValue?: number;
  images: string[];
  usageNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  currentHolder?: {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface CreateResourcePayload {
  spaceId: string;
  name: string;
  description?: string;
  category?: ResourceCategory;
  estimatedValue?: number;
  images?: string[];
  usageNotes?: string;
}

export interface UpdateResourcePayload {
  name?: string;
  description?: string;
  category?: ResourceCategory;
  estimatedValue?: number;
  images?: string[];
  usageNotes?: string;
}

export interface CheckoutResourcePayload {
  resourceId: string;
  memberId: string;
  returnDate?: string;
}

// ============= GROUP FUNDS =============

export type ContributionType = 'voluntary' | 'mandatory' | 'proportional';
export type FundStatus = 'active' | 'completed' | 'cancelled';

export interface GroupFund {
  id: string;
  spaceId: string;
  title: string;
  description?: string;
  purpose?: string;
  targetAmount: number;
  deadline?: string;
  currentAmount: number;
  contributionType: ContributionType;
  status: FundStatus;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed
  progress?: number; // 0-100
  daysRemaining?: number;
  // Joined data
  contributions?: FundContribution[];
  contributorCount?: number;
}

export interface CreateFundPayload {
  spaceId: string;
  title: string;
  description?: string;
  purpose?: string;
  targetAmount: number;
  deadline?: string;
  contributionType?: ContributionType;
}

export interface UpdateFundPayload {
  title?: string;
  description?: string;
  purpose?: string;
  targetAmount?: number;
  deadline?: string;
  contributionType?: ContributionType;
  status?: FundStatus;
}

// ============= FUND CONTRIBUTIONS =============

export interface FundContribution {
  id: string;
  fundId: string;
  memberId: string;
  amount: number;
  contributedAt: string;
  isConfirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  // Joined data
  member?: {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface CreateContributionPayload {
  fundId: string;
  memberId: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}

export interface ConfirmContributionPayload {
  contributionId: string;
  transactionId?: string;
}

// ============= DISCUSSIONS =============

export type DiscussionCategory = 'announcement' | 'question' | 'decision' | 'general';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Discussion {
  id: string;
  spaceId: string;
  createdBy: string;
  title: string;
  content?: string;
  category: DiscussionCategory;
  isPoll: boolean;
  pollOptions: PollOption[];
  pollVotes: Record<string, string>; // {member_id: option_id}
  pollDeadline?: string;
  isPinned: boolean;
  isResolved: boolean;
  resolvedAt?: string;
  replyCount: number;
  lastReplyAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  author?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  replies?: DiscussionReply[];
}

export interface CreateDiscussionPayload {
  spaceId: string;
  title: string;
  content?: string;
  category?: DiscussionCategory;
  isPoll?: boolean;
  pollOptions?: string[]; // Will be converted to PollOption[]
  pollDeadline?: string;
}

export interface UpdateDiscussionPayload {
  title?: string;
  content?: string;
  category?: DiscussionCategory;
  isPinned?: boolean;
  isResolved?: boolean;
}

export interface VotePollPayload {
  discussionId: string;
  memberId: string;
  optionId: string;
}

// ============= DISCUSSION REPLIES =============

export interface DiscussionReply {
  id: string;
  discussionId: string;
  authorId: string;
  content: string;
  parentReplyId?: string;
  reactions: Record<string, string[]>; // {emoji: [user_ids]}
  createdAt: string;
  updatedAt: string;
  // Joined data
  author?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  replies?: DiscussionReply[]; // Nested replies
}

export interface CreateReplyPayload {
  discussionId: string;
  content: string;
  parentReplyId?: string;
}

export interface UpdateReplyPayload {
  content?: string;
}

export interface AddReactionPayload {
  replyId: string;
  emoji: string;
  userId: string;
}

// ============= DASHBOARD & VIEWS =============

export interface TriboDashboardData {
  nextRituals: Array<RitualOccurrence & { ritual: TriboRitual }>;
  activeFunds: GroupFund[];
  recentDiscussions: Discussion[];
  availableResources: SharedResource[];
  memberActivity: {
    recentRSVPs: number;
    recentContributions: number;
    recentPosts: number;
  };
}

export interface MemberProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  joinedAt: string;
  // Context-specific data
  rsvpHistory?: Array<{
    occurrenceId: string;
    ritualName: string;
    status: RSVPStatus;
  }>;
  contributions?: FundContribution[];
  discussionCount?: number;
}

// ============= HELPER TYPES =============

export interface RecurrenceHelpers {
  parseRRule(rule: string): {
    frequency: RecurrenceFrequency;
    interval: number;
    byWeekDay?: number[];
    byMonthDay?: number;
  };
  createRRule(params: {
    frequency: RecurrenceFrequency;
    interval?: number;
    byWeekDay?: number[];
    byMonthDay?: number;
  }): string;
  getNextOccurrence(rule: string, after?: Date): Date | null;
  getOccurrencesBetween(rule: string, start: Date, end: Date): Date[];
}

export interface NotificationPreferences {
  ritualReminders: boolean;
  fundUpdates: boolean;
  discussionReplies: boolean;
  resourceAvailability: boolean;
}
