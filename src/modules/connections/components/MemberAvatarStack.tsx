import React from 'react';

interface Member {
  id: string;
  name: string;
  avatar_url?: string;
}

interface MemberAvatarStackProps {
  members: Member[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * MemberAvatarStack Component
 *
 * Displays an overlapping stack of member avatars with ceramic-concave styling.
 * Shows initials as fallback and a "+N" indicator for overflow members.
 *
 * @example
 * ```tsx
 * <MemberAvatarStack
 *   members={spaceMembers}
 *   maxVisible={4}
 *   size="md"
 *   onClick={() => console.log('Stack clicked')}
 * />
 * ```
 */
export const MemberAvatarStack: React.FC<MemberAvatarStackProps> = ({
  members,
  maxVisible = 4,
  size = 'md',
  onClick,
}) => {
  // Determine size classes based on prop
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',      // 24px
    md: 'w-8 h-8 text-sm',      // 32px
    lg: 'w-10 h-10 text-base',  // 40px
  };

  const sizeClass = sizeClasses[size];

  // Calculate visible members and overflow count
  const visibleMembers = members.slice(0, maxVisible);
  const overflowCount = Math.max(0, members.length - maxVisible);
  const hasOverflow = overflowCount > 0;

  /**
   * Extracts initials from a member's name
   * @param name - Full name of the member
   * @returns Initials (max 2 characters)
   */
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`flex items-center ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Avatar Stack */}
      <div className="flex items-center -space-x-2">
        {visibleMembers.map((member, index) => (
          <div
            key={member.id}
            className={`
              ${sizeClass}
              rounded-full
              ceramic-concave
              border-2 border-[#F0EFE9]
              overflow-hidden
              flex items-center justify-center
              transition-transform hover:scale-110 hover:z-10
            `}
            style={{ zIndex: visibleMembers.length - index }}
            title={member.name}
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-stone-600 font-medium select-none">
                {getInitials(member.name)}
              </span>
            )}
          </div>
        ))}

        {/* Overflow Count Indicator */}
        {hasOverflow && (
          <div
            className={`
              ${sizeClass}
              rounded-full
              ceramic-inset
              border-2 border-[#F0EFE9]
              flex items-center justify-center
              bg-stone-300
            `}
            style={{ zIndex: 0 }}
            title={`${overflowCount} more member${overflowCount > 1 ? 's' : ''}`}
          >
            <span className="text-stone-700 font-semibold text-xs select-none">
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberAvatarStack;
