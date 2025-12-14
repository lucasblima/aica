import type { Meta, StoryObj } from '@storybook/react';
import { SpaceDetailsHeader } from '../SpaceDetailsHeader';
import { ConnectionSpace } from '../../types';

/**
 * SpaceDetailsHeader displays the header section of a connection space detail page.
 *
 * Features:
 * - Archetype-specific accent colors
 * - Space icon, name, subtitle, and description
 * - Member count and creation date stats
 * - Action buttons (invite, settings)
 * - Back navigation button
 * - Ceramic design system styling
 */
const meta: Meta<typeof SpaceDetailsHeader> = {
  title: 'Connections/SpaceDetailsHeader',
  component: SpaceDetailsHeader,
  parameters: {
    layout: 'padded',
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
      <div className="bg-ceramic-bg min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock spaces
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
  last_accessed_at: new Date().toISOString(),
  settings: {},
  created_at: new Date('2024-01-15').toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Default habitat header with all features
 */
export const Default: Story = {
  args: {
    space: createSpace({}),
    memberCount: 5,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Habitat header - Earthy terracotta accent (amber-600)
 */
export const HabitatHeader: Story = {
  args: {
    space: createSpace({
      archetype: 'habitat',
      name: 'Condomínio Solar',
      subtitle: 'Apartamento 302 - Torre A',
      description: 'Gestão completa do apartamento com controle de despesas condominiais, manutenção preventiva e comunicação com síndico.',
      icon: '🏠',
      created_at: new Date('2023-06-01').toISOString(),
    }),
    memberCount: 4,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Ventures header - Slate blue accent (slate-600)
 */
export const VenturesHeader: Story = {
  args: {
    space: createSpace({
      archetype: 'ventures',
      name: 'AI Ventures LTDA',
      subtitle: 'Startup em Série A',
      description: 'Dashboard executivo para acompanhamento de métricas, runway, OKRs e gestão de stakeholders. Cockpit completo para tomada de decisões estratégicas.',
      icon: '💼',
      created_at: new Date('2024-03-10').toISOString(),
    }),
    memberCount: 12,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Academia header - Academic blue/gold accent (blue-700)
 */
export const AcademiaHeader: Story = {
  args: {
    space: createSpace({
      archetype: 'academia',
      name: 'Mestrado em Inteligência Artificial',
      subtitle: 'Universidade Federal - 2023/2025',
      description: 'Organização de pesquisas, papers, cronograma de defesa e material de estudo. Biblioteca pessoal de conhecimento acadêmico.',
      icon: '🎓',
      created_at: new Date('2023-03-01').toISOString(),
    }),
    memberCount: 3,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Tribo header - Warm emerald accent (emerald-600)
 */
export const TriboHeader: Story = {
  args: {
    space: createSpace({
      archetype: 'tribo',
      name: 'Família Silva',
      subtitle: 'Reuniões e Celebrações',
      description: 'Calendário familiar, álbum de fotos, organização de eventos importantes e momentos especiais compartilhados.',
      icon: '👥',
      created_at: new Date('2020-01-01').toISOString(),
    }),
    memberCount: 8,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * With all action buttons
 */
export const WithActions: Story = {
  args: {
    space: createSpace({
      archetype: 'ventures',
      name: 'Tech Startup',
      subtitle: 'Equipe de Produto',
      description: 'Espaço colaborativo para o time de produto.',
      icon: '🚀',
    }),
    memberCount: 15,
    onSettingsClick: () => alert('Abrir configurações'),
    onInviteClick: () => alert('Convidar membro'),
    onBackClick: () => alert('Voltar'),
  },
};

/**
 * Without back button
 */
export const WithoutBackButton: Story = {
  args: {
    space: createSpace({}),
    memberCount: 5,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    // No onBackClick
  },
};

/**
 * Without action buttons
 */
export const WithoutActions: Story = {
  args: {
    space: createSpace({
      name: 'Espaço Somente Leitura',
      description: 'Visualização sem ações disponíveis.',
    }),
    memberCount: 3,
    onBackClick: () => console.log('Back clicked'),
    // No onSettingsClick or onInviteClick
  },
};

/**
 * With only invite button
 */
export const InviteOnly: Story = {
  args: {
    space: createSpace({}),
    memberCount: 5,
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
    // No onSettingsClick
  },
};

/**
 * With only settings button
 */
export const SettingsOnly: Story = {
  args: {
    space: createSpace({}),
    memberCount: 5,
    onSettingsClick: () => console.log('Settings clicked'),
    onBackClick: () => console.log('Back clicked'),
    // No onInviteClick
  },
};

/**
 * Large team
 */
export const LargeTeam: Story = {
  args: {
    space: createSpace({
      archetype: 'tribo',
      name: 'Comunidade Tech BR',
      subtitle: 'Comunidade de Desenvolvedores',
      description: 'Grande comunidade de profissionais de tecnologia colaborando em projetos open source e eventos.',
      icon: '🌟',
    }),
    memberCount: 127,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Solo space (1 member)
 */
export const SoloSpace: Story = {
  args: {
    space: createSpace({
      archetype: 'academia',
      name: 'Estudos Pessoais',
      subtitle: 'Aprendizado Individual',
      description: 'Espaço privado para organização de estudos e conhecimento.',
      icon: '📚',
    }),
    memberCount: 1,
    onSettingsClick: () => console.log('Settings clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Without subtitle
 */
export const WithoutSubtitle: Story = {
  args: {
    space: createSpace({
      subtitle: undefined,
      name: 'Projeto Simples',
      description: 'Espaço sem subtítulo.',
    }),
    memberCount: 5,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Without description
 */
export const WithoutDescription: Story = {
  args: {
    space: createSpace({
      description: undefined,
      name: 'Espaço Minimalista',
    }),
    memberCount: 5,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Long content that wraps
 */
export const LongContent: Story = {
  args: {
    space: createSpace({
      name: 'Centro de Pesquisa e Desenvolvimento em Inteligência Artificial Aplicada',
      subtitle: 'Laboratório de Pesquisa Avançada - Departamento de Ciências da Computação',
      description: 'Este é um espaço colaborativo dedicado ao desenvolvimento de pesquisas de ponta em inteligência artificial, machine learning, deep learning e suas aplicações práticas em diferentes domínios da indústria e academia. Aqui coordenamos projetos de pesquisa, publicações científicas, orientações de mestrado e doutorado, além de colaborações internacionais com outras instituições renomadas.',
      icon: '🔬',
    }),
    memberCount: 24,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Newly created space (created today)
 */
export const NewlyCreated: Story = {
  args: {
    space: createSpace({
      name: 'Novo Projeto',
      subtitle: 'Criado hoje',
      description: 'Espaço recém-criado.',
      created_at: new Date().toISOString(),
    }),
    memberCount: 1,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * Old space (created years ago)
 */
export const OldSpace: Story = {
  args: {
    space: createSpace({
      name: 'Projeto Legado',
      subtitle: 'Estabelecido há muito tempo',
      description: 'Espaço com longa história.',
      created_at: new Date('2018-01-01').toISOString(),
    }),
    memberCount: 42,
    onSettingsClick: () => console.log('Settings clicked'),
    onInviteClick: () => console.log('Invite clicked'),
    onBackClick: () => console.log('Back clicked'),
  },
};

/**
 * All four archetypes comparison
 */
export const AllArchetypes: Story = {
  render: () => (
    <div className="space-y-12">
      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'habitat',
          name: 'Condomínio Solar',
          subtitle: 'Apartamento 302',
          icon: '🏠',
        })}
        memberCount={4}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />

      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'ventures',
          name: 'AI Ventures',
          subtitle: 'Startup',
          icon: '💼',
        })}
        memberCount={12}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />

      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'academia',
          name: 'Mestrado em IA',
          subtitle: 'Universidade',
          icon: '🎓',
        })}
        memberCount={3}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />

      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'tribo',
          name: 'Família Silva',
          subtitle: 'Comunidade',
          icon: '👥',
        })}
        memberCount={8}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * With custom icons
 */
export const CustomIcons: Story = {
  render: () => (
    <div className="space-y-12">
      <SpaceDetailsHeader
        space={createSpace({
          name: 'Casa de Praia',
          subtitle: 'Florianópolis',
          icon: '🏖️',
        })}
        memberCount={6}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />

      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'ventures',
          name: 'Agência Criativa',
          subtitle: 'Design & Marketing',
          icon: '🎨',
        })}
        memberCount={8}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />

      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'academia',
          name: 'Curso de Fotografia',
          subtitle: 'Aprendizado Prático',
          icon: '📷',
        })}
        memberCount={15}
        onSettingsClick={() => {}}
        onInviteClick={() => {}}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * Interactive example with working buttons
 */
export const Interactive: Story = {
  render: () => {
    const handleBack = () => alert('Navegando de volta');
    const handleSettings = () => alert('Abrindo configurações do espaço');
    const handleInvite = () => alert('Abrindo formulário de convite');

    return (
      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'ventures',
          name: 'Meu Projeto',
          subtitle: 'Exemplo Interativo',
          description: 'Clique nos botões para ver as ações.',
        })}
        memberCount={7}
        onBackClick={handleBack}
        onSettingsClick={handleSettings}
        onInviteClick={handleInvite}
      />
    );
  },
};

/**
 * In page context with content below
 */
export const InPageContext: Story = {
  render: () => (
    <div>
      <SpaceDetailsHeader
        space={createSpace({
          archetype: 'habitat',
          name: 'Apartamento 302',
          subtitle: 'Condomínio Solar',
          description: 'Gestão completa do apartamento.',
        })}
        memberCount={4}
        onBackClick={() => console.log('Back')}
        onSettingsClick={() => console.log('Settings')}
        onInviteClick={() => console.log('Invite')}
      />

      {/* Example content below header */}
      <div className="mt-8 space-y-4">
        <div className="ceramic-card p-6">
          <h3 className="font-bold text-ceramic-text-primary mb-2">Despesas Recentes</h3>
          <p className="text-sm text-ceramic-text-secondary">Conteúdo da página...</p>
        </div>
        <div className="ceramic-card p-6">
          <h3 className="font-bold text-ceramic-text-primary mb-2">Próximos Eventos</h3>
          <p className="text-sm text-ceramic-text-secondary">Mais conteúdo...</p>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
