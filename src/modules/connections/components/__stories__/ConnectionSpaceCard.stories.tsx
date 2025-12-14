import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionSpaceCard } from '../ConnectionSpaceCard';
import { ConnectionSpace } from '../../types';

/**
 * ConnectionSpaceCard displays a connection space with archetype-specific styling.
 *
 * Each archetype has distinct visual treatments:
 * - HABITAT: Earthy terracotta tones, grounded aesthetic
 * - VENTURES: Precise blue tones, dashboard-like
 * - ACADEMIA: Serene purple tones, contemplative
 * - TRIBO: Warm amber tones, embracing
 */
const meta: Meta<typeof ConnectionSpaceCard> = {
  title: 'Connections/ConnectionSpaceCard',
  component: ConnectionSpaceCard,
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
      <div className="p-8 bg-ceramic-bg min-h-screen flex items-center justify-center">
        <div style={{ width: '320px' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Base space template
const createSpace = (overrides: Partial<ConnectionSpace>): ConnectionSpace => ({
  id: '1',
  user_id: 'user-123',
  archetype: 'habitat',
  name: 'Condomínio Solar',
  subtitle: 'Apartamento 302',
  description: 'Gestão completa do apartamento, despesas condominiais e manutenção.',
  icon: '🏠',
  color_theme: 'earth',
  is_active: true,
  is_favorite: false,
  last_accessed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Default habitat card with all features enabled
 */
export const Default: Story = {
  args: {
    space: createSpace({}),
    memberCount: 5,
    variant: 'default',
  },
};

/**
 * Habitat archetype - Earthy, grounded aesthetic with terracotta colors
 */
export const HabitatVariant: Story = {
  args: {
    space: createSpace({
      archetype: 'habitat',
      name: 'Condomínio Solar',
      subtitle: 'Apartamento 302',
      description: 'Gestão completa do apartamento com controle de despesas condominiais e manutenção preventiva.',
      icon: '🏠',
    }),
    memberCount: 4,
    variant: 'default',
  },
};

/**
 * Ventures archetype - Precise, dashboard-like with blue tones
 */
export const VenturesVariant: Story = {
  args: {
    space: createSpace({
      archetype: 'ventures',
      name: 'AI Ventures',
      subtitle: 'Startup em crescimento',
      description: 'Dashboard executivo para acompanhamento de métricas, runway e OKRs da empresa.',
      icon: '💼',
      color_theme: 'amber',
    }),
    memberCount: 12,
    variant: 'default',
  },
};

/**
 * Academia archetype - Serene, contemplative with purple/blue tones
 */
export const AcademiaVariant: Story = {
  args: {
    space: createSpace({
      archetype: 'academia',
      name: 'Mestrado em IA',
      subtitle: 'Universidade Federal',
      description: 'Organização de pesquisas, papers e cronograma de defesa da tese.',
      icon: '🎓',
      color_theme: 'paper',
    }),
    memberCount: 3,
    variant: 'default',
  },
};

/**
 * Tribo archetype - Warm, embracing with emerald/amber tones
 */
export const TriboVariant: Story = {
  args: {
    space: createSpace({
      archetype: 'tribo',
      name: 'Família Silva',
      subtitle: 'Reuniões e celebrações',
      description: 'Calendário familiar, álbum de fotos e organização de eventos importantes.',
      icon: '👥',
      color_theme: 'warm',
    }),
    memberCount: 8,
    variant: 'default',
  },
};

/**
 * Card with many members to demonstrate member count display
 */
export const WithManyMembers: Story = {
  args: {
    space: createSpace({
      archetype: 'ventures',
      name: 'Tech Corp',
      subtitle: 'Grande equipe',
      description: 'Empresa com muitos colaboradores e departamentos.',
      icon: '🏢',
    }),
    memberCount: 47,
    variant: 'default',
  },
};

/**
 * Selected/favorite state with star indicator
 */
export const SelectedState: Story = {
  args: {
    space: createSpace({
      is_favorite: true,
      name: 'Meu Espaço Favorito',
      subtitle: 'Marcado como favorito',
    }),
    memberCount: 5,
    variant: 'default',
    onFavoriteToggle: () => console.log('Toggle favorite'),
  },
};

/**
 * Compact variant for sidebars and lists
 */
export const CompactVariant: Story = {
  args: {
    space: createSpace({
      archetype: 'habitat',
      name: 'Condomínio Solar',
      subtitle: 'Apartamento 302',
    }),
    variant: 'compact',
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-ceramic-bg min-h-screen flex items-center justify-center">
        <div style={{ width: '400px' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

/**
 * Compact variant with favorite state
 */
export const CompactFavorite: Story = {
  args: {
    space: createSpace({
      is_favorite: true,
      archetype: 'academia',
      name: 'Mestrado em IA',
      subtitle: 'Em andamento',
      icon: '🎓',
    }),
    variant: 'compact',
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-ceramic-bg min-h-screen flex items-center justify-center">
        <div style={{ width: '400px' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

/**
 * Recent activity indicator
 */
export const WithRecentActivity: Story = {
  args: {
    space: createSpace({
      last_accessed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      name: 'Espaço Recente',
      subtitle: 'Acessado recentemente',
    }),
    memberCount: 5,
    lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    variant: 'default',
  },
};

/**
 * Without description for cleaner look
 */
export const WithoutDescription: Story = {
  args: {
    space: createSpace({
      description: undefined,
      name: 'Espaço Minimalista',
      subtitle: 'Apenas o essencial',
    }),
    memberCount: 3,
    variant: 'default',
  },
};

/**
 * Without subtitle
 */
export const WithoutSubtitle: Story = {
  args: {
    space: createSpace({
      subtitle: undefined,
      name: 'Meu Projeto',
      archetype: 'ventures',
      icon: '💼',
    }),
    memberCount: 2,
    variant: 'default',
  },
};

/**
 * Interactive example with all archetypes in a grid
 */
export const AllArchetypes: Story = {
  render: () => (
    <div className="p-8 bg-ceramic-bg min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        <ConnectionSpaceCard
          space={createSpace({
            archetype: 'habitat',
            name: 'Condomínio Solar',
            subtitle: 'Apartamento 302',
            icon: '🏠',
          })}
          memberCount={4}
          variant="default"
        />
        <ConnectionSpaceCard
          space={createSpace({
            archetype: 'ventures',
            name: 'AI Ventures',
            subtitle: 'Startup',
            icon: '💼',
          })}
          memberCount={12}
          variant="default"
        />
        <ConnectionSpaceCard
          space={createSpace({
            archetype: 'academia',
            name: 'Mestrado em IA',
            subtitle: 'Universidade',
            icon: '🎓',
          })}
          memberCount={3}
          variant="default"
        />
        <ConnectionSpaceCard
          space={createSpace({
            archetype: 'tribo',
            name: 'Família Silva',
            subtitle: 'Comunidade',
            icon: '👥',
          })}
          memberCount={8}
          variant="default"
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Comparison of default and compact variants
 */
export const VariantComparison: Story = {
  render: () => (
    <div className="p-8 bg-ceramic-bg min-h-screen">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-4">Default Variant</h3>
          <ConnectionSpaceCard
            space={createSpace({
              archetype: 'habitat',
              name: 'Condomínio Solar',
              subtitle: 'Apartamento 302',
              icon: '🏠',
            })}
            memberCount={4}
            variant="default"
          />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-4">Compact Variant</h3>
          <ConnectionSpaceCard
            space={createSpace({
              archetype: 'habitat',
              name: 'Condomínio Solar',
              subtitle: 'Apartamento 302',
              icon: '🏠',
            })}
            variant="compact"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
