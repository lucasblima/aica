import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User } from 'lucide-react';
import { ConnectionMember } from '../types';

interface SpaceMemberListProps {
  /** Array of members to display */
  members: ConnectionMember[];
  /** Maximum number of avatars to display before showing "+N" */
  maxDisplay?: number;
  /** Click handler for individual members */
  onMemberClick?: (member: ConnectionMember) => void;
  /** Handler for invite button */
  onInvite?: () => void;
  /** Show invite button */
  showInviteButton?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * SpaceMemberList - Avatar stack component for displaying space members
 *
 * Displays members as overlapping circular avatars with tooltip on hover.
 * Shows "+N" badge when there are more members than maxDisplay.
 * Optionally includes an invite button.
 *
 * @example
 * ```tsx
 * <SpaceMemberList
 *   members={spaceMembers}
 *   maxDisplay={5}
 *   size="md"
 *   showInviteButton
 *   onMemberClick={(member) => viewProfile(member)}
 *   onInvite={() => setShowInviteModal(true)}
 * />
 * ```
 */
export function SpaceMemberList({
  members,
  maxDisplay = 5,
  onMemberClick,
  onInvite,
  showInviteButton = false,
  size = 'md',
}: SpaceMemberListProps) {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Size configurations
  const sizeConfig = {
    sm: {
      avatar: 'w-8 h-8',
      text: 'text-xs',
      offset: '-ml-2',
      badge: 'w-8 h-8 text-[10px]',
      inviteButton: 'w-8 h-8',
      inviteIcon: 'w-3 h-3',
    },
    md: {
      avatar: 'w-10 h-10',
      text: 'text-sm',
      offset: '-ml-3',
      badge: 'w-10 h-10 text-xs',
      inviteButton: 'w-10 h-10',
      inviteIcon: 'w-4 h-4',
    },
    lg: {
      avatar: 'w-12 h-12',
      text: 'text-base',
      offset: '-ml-4',
      badge: 'w-12 h-12 text-sm',
      inviteButton: 'w-12 h-12',
      inviteIcon: 'w-5 h-5',
    },
  };

  const config = sizeConfig[size];

  // Calculate visible and remaining members
  const visibleMembers = members.slice(0, maxDisplay);
  const remainingCount = Math.max(0, members.length - maxDisplay);

  // Get member display name
  const getMemberName = (member: ConnectionMember): string => {
    if (member.external_name) return member.external_name;
    return 'Membro';
  };

  // Get member initials for avatar
  const getMemberInitials = (member: ConnectionMember): string => {
    const name = getMemberName(member);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate avatar background color based on member ID
  const getAvatarColor = (memberId: string): string => {
    const colors = [
      'bg-ceramic-info/15 text-ceramic-info',
      'bg-ceramic-accent/15 text-ceramic-accent',
      'bg-ceramic-success/15 text-ceramic-success',
      'bg-ceramic-warning/15 text-ceramic-warning',
      'bg-pink-100 text-pink-600',
      'bg-teal-100 text-teal-600',
    ];
    const index = memberId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex items-center">
      {/* Avatar stack */}
      <div className="flex items-center">
        {visibleMembers.map((member, index) => {
          const isFirst = index === 0;
          const colorClass = getAvatarColor(member.id);

          return (
            <motion.div
              key={member.id}
              className={`relative ${!isFirst ? config.offset : ''}`}
              style={{ zIndex: visibleMembers.length - index }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              onMouseEnter={() => setHoveredMember(member.id)}
              onMouseLeave={() => setHoveredMember(null)}
            >
              {/* Avatar */}
              <button
                onClick={() => onMemberClick?.(member)}
                className={`
                  ${config.avatar}
                  rounded-full
                  flex items-center justify-center
                  font-bold
                  border-2 border-ceramic-base
                  ${colorClass}
                  hover:scale-110 active:scale-95
                  transition-transform
                  cursor-pointer
                  ceramic-concave
                `}
                aria-label={getMemberName(member)}
              >
                {member.external_avatar_url ? (
                  <img
                    src={member.external_avatar_url}
                    alt={getMemberName(member)}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className={config.text}>
                    {getMemberInitials(member)}
                  </span>
                )}
              </button>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredMember === member.id && (
                  <motion.div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-ceramic-text-primary text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg"
                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="relative">
                      {getMemberName(member)}
                      {member.context_label && (
                        <div className="text-[10px] text-white/70">
                          {member.context_label}
                        </div>
                      )}
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-ceramic-text-primary" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Remaining count badge */}
        {remainingCount > 0 && (
          <motion.div
            className={`
              ${config.badge}
              ${config.offset}
              rounded-full
              ceramic-concave
              flex items-center justify-center
              font-bold
              text-ceramic-text-secondary
              bg-ceramic-cool
              border-2 border-ceramic-base
            `}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: visibleMembers.length * 0.05 }}
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </motion.div>
        )}
      </div>

      {/* Invite button */}
      {showInviteButton && onInvite && (
        <motion.button
          onClick={onInvite}
          className={`
            ${config.inviteButton}
            ml-3
            rounded-full
            ceramic-card
            flex items-center justify-center
            text-ceramic-accent
            hover:scale-105 active:scale-95
            transition-transform
          `}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: (visibleMembers.length + (remainingCount > 0 ? 1 : 0)) * 0.05 }}
          aria-label="Convidar membro"
        >
          <Plus className={config.inviteIcon} />
        </motion.button>
      )}
    </div>
  );
}

export default SpaceMemberList;
