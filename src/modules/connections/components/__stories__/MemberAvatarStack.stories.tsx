import type { Meta, StoryObj } from '@storybook/react';
import { MemberAvatarStack } from '../MemberAvatarStack';

/**
 * MemberAvatarStack displays an overlapping stack of member avatars
 * with ceramic-concave styling and overflow indicators.
 *
 * Features:
 * - Three size variants: sm (24px), md (32px), lg (40px)
 * - Automatic initials generation from names
 * - Overflow indicator showing "+N more"
 * - Hover effects with scale animation
 * - Ceramic design system styling
 */
const meta: Meta<typeof MemberAvatarStack> = {
  title: 'Connections/MemberAvatarStack',
  component: MemberAvatarStack,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'ceramic',
      values: [
        { name: 'ceramic', value: '#F0EFE9' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-8 bg-ceramic-bg flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock member data
const mockMembers = [
  { id: '1', name: 'Lucas Silva', avatar_url: undefined },
  { id: '2', name: 'Maria Santos', avatar_url: undefined },
  { id: '3', name: 'João Pedro', avatar_url: undefined },
  { id: '4', name: 'Ana Costa', avatar_url: undefined },
];

const manyMembers = [
  { id: '1', name: 'Lucas Silva', avatar_url: undefined },
  { id: '2', name: 'Maria Santos', avatar_url: undefined },
  { id: '3', name: 'João Pedro', avatar_url: undefined },
  { id: '4', name: 'Ana Costa', avatar_url: undefined },
  { id: '5', name: 'Pedro Oliveira', avatar_url: undefined },
  { id: '6', name: 'Carla Mendes', avatar_url: undefined },
  { id: '7', name: 'Rafael Souza', avatar_url: undefined },
  { id: '8', name: 'Juliana Lima', avatar_url: undefined },
  { id: '9', name: 'Felipe Rocha', avatar_url: undefined },
];

const membersWithImages = [
  {
    id: '1',
    name: 'Lucas Silva',
    avatar_url: 'https://i.pravatar.cc/150?img=12'
  },
  {
    id: '2',
    name: 'Maria Santos',
    avatar_url: 'https://i.pravatar.cc/150?img=47'
  },
  {
    id: '3',
    name: 'João Pedro',
    avatar_url: 'https://i.pravatar.cc/150?img=33'
  },
  {
    id: '4',
    name: 'Ana Costa',
    avatar_url: 'https://i.pravatar.cc/150?img=24'
  },
];

/**
 * Default state with 4 members
 */
export const Default: Story = {
  args: {
    members: mockMembers,
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Small size variant (24px) for compact spaces
 */
export const SmallSize: Story = {
  args: {
    members: mockMembers,
    maxVisible: 4,
    size: 'sm',
  },
};

/**
 * Medium size variant (32px) - default size
 */
export const MediumSize: Story = {
  args: {
    members: mockMembers,
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Large size variant (40px) for prominent display
 */
export const LargeSize: Story = {
  args: {
    members: mockMembers,
    maxVisible: 4,
    size: 'lg',
  },
};

/**
 * With overflow indicator showing "+5 more"
 */
export const WithOverflow: Story = {
  args: {
    members: manyMembers,
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Large overflow count
 */
export const LargeOverflow: Story = {
  args: {
    members: [
      ...manyMembers,
      { id: '10', name: 'User 10', avatar_url: undefined },
      { id: '11', name: 'User 11', avatar_url: undefined },
      { id: '12', name: 'User 12', avatar_url: undefined },
      { id: '13', name: 'User 13', avatar_url: undefined },
      { id: '14', name: 'User 14', avatar_url: undefined },
      { id: '15', name: 'User 15', avatar_url: undefined },
    ],
    maxVisible: 3,
    size: 'md',
  },
};

/**
 * Single member - no stack needed
 */
export const SingleMember: Story = {
  args: {
    members: [{ id: '1', name: 'Lucas Silva', avatar_url: undefined }],
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Two members - minimal stack
 */
export const TwoMembers: Story = {
  args: {
    members: [
      { id: '1', name: 'Lucas Silva', avatar_url: undefined },
      { id: '2', name: 'Maria Santos', avatar_url: undefined },
    ],
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * With avatar images instead of initials
 */
export const WithImages: Story = {
  args: {
    members: membersWithImages,
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * With images and overflow
 */
export const WithImagesAndOverflow: Story = {
  args: {
    members: [
      ...membersWithImages,
      { id: '5', name: 'Pedro Oliveira', avatar_url: 'https://i.pravatar.cc/150?img=68' },
      { id: '6', name: 'Carla Mendes', avatar_url: 'https://i.pravatar.cc/150?img=45' },
      { id: '7', name: 'Rafael Souza', avatar_url: 'https://i.pravatar.cc/150?img=15' },
    ],
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Initials only - demonstrating fallback behavior
 */
export const InitialsOnly: Story = {
  args: {
    members: [
      { id: '1', name: 'Alice', avatar_url: undefined },
      { id: '2', name: 'Bob', avatar_url: undefined },
      { id: '3', name: 'Charlie', avatar_url: undefined },
      { id: '4', name: 'Diana', avatar_url: undefined },
    ],
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Mixed content - some with images, some with initials
 */
export const MixedContent: Story = {
  args: {
    members: [
      { id: '1', name: 'Lucas Silva', avatar_url: 'https://i.pravatar.cc/150?img=12' },
      { id: '2', name: 'Maria Santos', avatar_url: undefined },
      { id: '3', name: 'João Pedro', avatar_url: 'https://i.pravatar.cc/150?img=33' },
      { id: '4', name: 'Ana Costa', avatar_url: undefined },
    ],
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Clickable stack with onClick handler
 */
export const Clickable: Story = {
  args: {
    members: mockMembers,
    maxVisible: 4,
    size: 'md',
    onClick: () => alert('Avatar stack clicked!'),
  },
};

/**
 * Empty state - no members
 */
export const Empty: Story = {
  args: {
    members: [],
    maxVisible: 4,
    size: 'md',
  },
};

/**
 * Size comparison showing all three variants
 */
export const SizeComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Small (24px)
        </p>
        <MemberAvatarStack members={mockMembers} maxVisible={4} size="sm" />
      </div>
      <div>
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Medium (32px)
        </p>
        <MemberAvatarStack members={mockMembers} maxVisible={4} size="md" />
      </div>
      <div>
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Large (40px)
        </p>
        <MemberAvatarStack members={mockMembers} maxVisible={4} size="lg" />
      </div>
    </div>
  ),
};

/**
 * Different maxVisible values
 */
export const MaxVisibleComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Max 2 visible
        </p>
        <MemberAvatarStack members={manyMembers} maxVisible={2} size="md" />
      </div>
      <div>
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Max 4 visible
        </p>
        <MemberAvatarStack members={manyMembers} maxVisible={4} size="md" />
      </div>
      <div>
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Max 6 visible
        </p>
        <MemberAvatarStack members={manyMembers} maxVisible={6} size="md" />
      </div>
    </div>
  ),
};

/**
 * In context - inside a card header
 */
export const InCardContext: Story = {
  render: () => (
    <div className="ceramic-card p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-ceramic-text-primary">
          Equipe do Projeto
        </h3>
        <MemberAvatarStack
          members={membersWithImages}
          maxVisible={3}
          size="sm"
          onClick={() => console.log('View all members')}
        />
      </div>
      <p className="text-sm text-ceramic-text-secondary">
        4 membros colaborando neste espaço
      </p>
    </div>
  ),
};

/**
 * Real-world usage scenarios
 */
export const UsageScenarios: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl">
      {/* Scenario 1: Small team */}
      <div className="ceramic-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <h4 className="font-bold text-ceramic-text-primary">Apartamento 302</h4>
              <p className="text-xs text-ceramic-text-secondary">Habitat</p>
            </div>
          </div>
          <MemberAvatarStack
            members={mockMembers.slice(0, 2)}
            maxVisible={4}
            size="sm"
          />
        </div>
      </div>

      {/* Scenario 2: Medium team with overflow */}
      <div className="ceramic-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
              <span className="text-xl">💼</span>
            </div>
            <div>
              <h4 className="font-bold text-ceramic-text-primary">AI Ventures</h4>
              <p className="text-xs text-ceramic-text-secondary">Ventures</p>
            </div>
          </div>
          <MemberAvatarStack
            members={manyMembers}
            maxVisible={4}
            size="md"
            onClick={() => console.log('View team')}
          />
        </div>
      </div>

      {/* Scenario 3: Large team */}
      <div className="ceramic-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
            <div>
              <h4 className="font-bold text-ceramic-text-primary">Comunidade Tech</h4>
              <p className="text-xs text-ceramic-text-secondary">Tribo</p>
            </div>
          </div>
          <MemberAvatarStack
            members={[...manyMembers, ...manyMembers]}
            maxVisible={3}
            size="md"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};
