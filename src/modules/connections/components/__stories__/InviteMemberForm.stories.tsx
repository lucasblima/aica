import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { InviteMemberForm } from '../InviteMemberForm';

/**
 * InviteMemberForm provides a ceramic-styled form for inviting members
 * to connection spaces via email.
 *
 * Features:
 * - Email validation with real-time feedback
 * - Loading and error states
 * - Success state with form reset
 * - Ceramic design system styling
 * - Accessible form controls
 */
const meta: Meta<typeof InviteMemberForm> = {
  title: 'Connections/InviteMemberForm',
  component: InviteMemberForm,
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
      <div className="p-8 bg-ceramic-bg flex items-center justify-center min-h-screen">
        <div className="ceramic-card p-6" style={{ width: '420px' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state ready for input
 */
export const Default: Story = {
  args: {
    spaceId: 'space-123',
    onInvite: async (email: string) => {
      console.log('Inviting:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    onCancel: () => console.log('Cancelled'),
    isLoading: false,
  },
};

/**
 * With validation error displayed
 */
export const WithValidationError: Story = {
  render: () => {
    const [error, setError] = useState<string>('');

    const handleInvite = async (email: string) => {
      if (!email.includes('@')) {
        setError('Email inválido. Use o formato: email@exemplo.com');
        throw new Error('Email inválido');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    };

    return (
      <InviteMemberForm
        spaceId="space-123"
        onInvite={handleInvite}
        onCancel={() => console.log('Cancelled')}
        isLoading={false}
      />
    );
  },
};

/**
 * Loading state during API call
 */
export const LoadingState: Story = {
  args: {
    spaceId: 'space-123',
    onInvite: async (email: string) => {
      console.log('Inviting:', email);
      await new Promise(resolve => setTimeout(resolve, 5000));
    },
    onCancel: () => console.log('Cancelled'),
    isLoading: true,
  },
};

/**
 * Submitting state with spinner
 */
export const SubmittingState: Story = {
  render: () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInvite = async (email: string) => {
      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSubmitting(false);
      console.log('Invited:', email);
    };

    return (
      <InviteMemberForm
        spaceId="space-123"
        onInvite={handleInvite}
        onCancel={() => console.log('Cancelled')}
        isLoading={isSubmitting}
      />
    );
  },
};

/**
 * Success state with form reset
 */
export const SuccessState: Story = {
  render: () => {
    const [message, setMessage] = useState<string>('');

    const handleInvite = async (email: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage(`Convite enviado para ${email}!`);
      setTimeout(() => setMessage(''), 3000);
    };

    return (
      <div className="space-y-4">
        <InviteMemberForm
          spaceId="space-123"
          onInvite={handleInvite}
          onCancel={() => console.log('Cancelled')}
          isLoading={false}
        />
        {message && (
          <div className="ceramic-card p-3 bg-green-50">
            <p className="text-sm text-green-700 font-medium text-center">
              {message}
            </p>
          </div>
        )}
      </div>
    );
  },
};

/**
 * Without cancel button
 */
export const WithoutCancel: Story = {
  args: {
    spaceId: 'space-123',
    onInvite: async (email: string) => {
      console.log('Inviting:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    // No onCancel prop
    isLoading: false,
  },
};

/**
 * Interactive example with full workflow
 */
export const InteractiveWorkflow: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleInvite = async (email: string) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate random success/failure
      if (Math.random() > 0.3) {
        setSuccess(`Convite enviado para ${email} com sucesso!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Erro ao enviar convite. Este email já foi convidado.');
      }

      setIsLoading(false);
    };

    const handleCancel = () => {
      setError(null);
      setSuccess(null);
      console.log('Form cancelled');
    };

    return (
      <div className="space-y-4">
        <InviteMemberForm
          spaceId="space-123"
          onInvite={handleInvite}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Success message */}
        {success && (
          <div className="ceramic-card p-4 bg-green-50 border border-green-200">
            <p className="text-sm text-green-700 font-medium text-center">
              ✓ {success}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="ceramic-card p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium text-center">
              ✗ {error}
            </p>
          </div>
        )}
      </div>
    );
  },
};

/**
 * In modal context
 */
export const InModalContext: Story = {
  render: () => {
    const [showModal, setShowModal] = useState(true);

    if (!showModal) {
      return (
        <button
          onClick={() => setShowModal(true)}
          className="ceramic-card px-6 py-3 font-medium hover:scale-105 active:scale-95 transition-transform"
        >
          Abrir Modal de Convite
        </button>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="ceramic-card p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">
            Convidar Membro
          </h2>
          <InviteMemberForm
            spaceId="space-123"
            onInvite={async (email: string) => {
              console.log('Invited:', email);
              await new Promise(resolve => setTimeout(resolve, 1000));
              setShowModal(false);
            }}
            onCancel={() => setShowModal(false)}
            isLoading={false}
          />
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * With custom validation
 */
export const CustomValidation: Story = {
  render: () => {
    const blockedDomains = ['spam.com', 'blocked.net'];

    const handleInvite = async (email: string) => {
      const domain = email.split('@')[1];
      if (blockedDomains.includes(domain)) {
        throw new Error('Este domínio não é permitido');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Invited:', email);
    };

    return (
      <div className="space-y-3">
        <div className="ceramic-card p-3 bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Nota:</strong> Domínios bloqueados: {blockedDomains.join(', ')}
          </p>
        </div>
        <InviteMemberForm
          spaceId="space-123"
          onInvite={handleInvite}
          onCancel={() => console.log('Cancelled')}
          isLoading={false}
        />
      </div>
    );
  },
};

/**
 * Multiple invites workflow
 */
export const MultipleInvites: Story = {
  render: () => {
    const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

    const handleInvite = async (email: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInvitedEmails(prev => [...prev, email]);
    };

    return (
      <div className="space-y-4">
        <InviteMemberForm
          spaceId="space-123"
          onInvite={handleInvite}
          onCancel={() => console.log('Cancelled')}
          isLoading={false}
        />

        {invitedEmails.length > 0 && (
          <div className="ceramic-card p-4">
            <h4 className="text-sm font-bold text-ceramic-text-primary mb-3">
              Convites Enviados ({invitedEmails.length})
            </h4>
            <div className="space-y-2">
              {invitedEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-ceramic-text-secondary"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  {email}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
};

/**
 * Form states comparison
 */
export const StatesComparison: Story = {
  render: () => (
    <div className="grid gap-6 max-w-4xl">
      <div>
        <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
          Default State
        </h3>
        <div className="ceramic-card p-6 max-w-md">
          <InviteMemberForm
            spaceId="space-123"
            onInvite={async () => {}}
            onCancel={() => {}}
            isLoading={false}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
          Loading State
        </h3>
        <div className="ceramic-card p-6 max-w-md">
          <InviteMemberForm
            spaceId="space-123"
            onInvite={async () => {}}
            onCancel={() => {}}
            isLoading={true}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};

/**
 * Different archetype contexts
 */
export const ArchetypeContexts: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
      {/* Habitat */}
      <div className="ceramic-card p-6 border-l-4 border-orange-500">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🏠</span>
          <div>
            <h3 className="font-bold text-ceramic-text-primary">Habitat</h3>
            <p className="text-xs text-ceramic-text-secondary">Convidar morador</p>
          </div>
        </div>
        <InviteMemberForm
          spaceId="habitat-123"
          onInvite={async (email) => console.log('Habitat invite:', email)}
          onCancel={() => {}}
          isLoading={false}
        />
      </div>

      {/* Ventures */}
      <div className="ceramic-card p-6 border-l-4 border-blue-500">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">💼</span>
          <div>
            <h3 className="font-bold text-ceramic-text-primary">Ventures</h3>
            <p className="text-xs text-ceramic-text-secondary">Convidar membro da equipe</p>
          </div>
        </div>
        <InviteMemberForm
          spaceId="ventures-123"
          onInvite={async (email) => console.log('Ventures invite:', email)}
          onCancel={() => {}}
          isLoading={false}
        />
      </div>

      {/* Academia */}
      <div className="ceramic-card p-6 border-l-4 border-purple-500">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🎓</span>
          <div>
            <h3 className="font-bold text-ceramic-text-primary">Academia</h3>
            <p className="text-xs text-ceramic-text-secondary">Convidar colega de estudo</p>
          </div>
        </div>
        <InviteMemberForm
          spaceId="academia-123"
          onInvite={async (email) => console.log('Academia invite:', email)}
          onCancel={() => {}}
          isLoading={false}
        />
      </div>

      {/* Tribo */}
      <div className="ceramic-card p-6 border-l-4 border-amber-500">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">👥</span>
          <div>
            <h3 className="font-bold text-ceramic-text-primary">Tribo</h3>
            <p className="text-xs text-ceramic-text-secondary">Convidar membro da comunidade</p>
          </div>
        </div>
        <InviteMemberForm
          spaceId="tribo-123"
          onInvite={async (email) => console.log('Tribo invite:', email)}
          onCancel={() => {}}
          isLoading={false}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};
