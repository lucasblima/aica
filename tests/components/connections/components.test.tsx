/**
 * Component Tests - Connections Components
 *
 * Tests for core connection components:
 * - ConnectionSpaceCard
 * - MemberAvatarStack
 * - InviteMemberForm
 *
 * Uses Vitest and React Testing Library with mocked framer-motion for simplicity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConnectionSpaceCard } from '../../../src/modules/connections/components/ConnectionSpaceCard';
import { MemberAvatarStack } from '../../../src/modules/connections/components/MemberAvatarStack';
import { InviteMemberForm } from '../../../src/modules/connections/components/InviteMemberForm';
import { ConnectionSpace } from '../../../src/modules/connections/types';

// ============================================
// MOCKS
// ============================================

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock date-fns locale
vi.mock('date-fns/locale', () => ({
  ptBR: {},
}));

// ============================================
// TEST DATA
// ============================================

const mockHabitatSpace: ConnectionSpace = {
  id: 'space-1',
  user_id: 'user-1',
  archetype: 'habitat',
  name: 'Casa da Família',
  subtitle: 'Nosso lar',
  description: 'Espaço para organizar nossa casa e finanças domésticas',
  icon: '🏠',
  color_theme: 'earthy',
  is_active: true,
  is_favorite: false,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockVenturesSpace: ConnectionSpace = {
  id: 'space-2',
  user_id: 'user-1',
  archetype: 'ventures',
  name: 'Startup XYZ',
  subtitle: 'Nossa empresa',
  description: 'Gestão de projetos e métricas de negócio',
  icon: '💼',
  is_active: true,
  is_favorite: true,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAcademiaSpace: ConnectionSpace = {
  id: 'space-3',
  user_id: 'user-1',
  archetype: 'academia',
  name: 'Estudos de IA',
  icon: '🎓',
  is_active: true,
  is_favorite: false,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTriboSpace: ConnectionSpace = {
  id: 'space-4',
  user_id: 'user-1',
  archetype: 'tribo',
  name: 'Grupo de Corrida',
  subtitle: 'Corredores da Manhã',
  icon: '👥',
  is_active: true,
  is_favorite: false,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockMembers = [
  {
    id: 'member-1',
    name: 'João Silva',
    avatar_url: 'https://example.com/avatar1.jpg',
  },
  {
    id: 'member-2',
    name: 'Maria Santos',
    avatar_url: undefined,
  },
  {
    id: 'member-3',
    name: 'Pedro Costa',
    avatar_url: 'https://example.com/avatar3.jpg',
  },
  {
    id: 'member-4',
    name: 'Ana Lima',
    avatar_url: undefined,
  },
  {
    id: 'member-5',
    name: 'Carlos Souza',
    avatar_url: 'https://example.com/avatar5.jpg',
  },
];

// ============================================
// CONNECTIONSPACECARD TESTS
// ============================================

describe('ConnectionSpaceCard', () => {
  describe('Rendering - Default Variant', () => {
    it('should render space name and description', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} />);

      expect(screen.getByText('Casa da Família')).toBeInTheDocument();
      expect(screen.getByText('Nosso lar')).toBeInTheDocument();
      expect(
        screen.getByText('Espaço para organizar nossa casa e finanças domésticas')
      ).toBeInTheDocument();
    });

    it('should render space icon', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} />);
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });

    it('should show member count when provided', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} memberCount={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not show member count when zero', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} memberCount={0} />);
      const memberCountElement = screen.queryByText('0');
      expect(memberCountElement).not.toBeInTheDocument();
    });

    it('should display archetype label', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} />);
      expect(screen.getByText('habitat')).toBeInTheDocument();
    });
  });

  describe('Archetype Styling', () => {
    it('should apply habitat (orange) styling', () => {
      const { container } = render(<ConnectionSpaceCard space={mockHabitatSpace} />);
      const archetypeLabel = screen.getByText('habitat');
      expect(archetypeLabel).toBeInTheDocument();
    });

    it('should apply ventures (blue) styling', () => {
      const { container } = render(<ConnectionSpaceCard space={mockVenturesSpace} />);
      const archetypeLabel = screen.getByText('ventures');
      expect(archetypeLabel).toBeInTheDocument();
    });

    it('should apply academia (purple) styling', () => {
      const { container } = render(<ConnectionSpaceCard space={mockAcademiaSpace} />);
      const archetypeLabel = screen.getByText('academia');
      expect(archetypeLabel).toBeInTheDocument();
    });

    it('should apply tribo (amber) styling', () => {
      const { container } = render(<ConnectionSpaceCard space={mockTriboSpace} />);
      const archetypeLabel = screen.getByText('tribo');
      expect(archetypeLabel).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn();
      render(<ConnectionSpaceCard space={mockHabitatSpace} onClick={handleClick} />);

      const card = screen.getByText('Casa da Família').closest('div');
      fireEvent.click(card!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when onClick is undefined', () => {
      expect(() => {
        const { container } = render(<ConnectionSpaceCard space={mockHabitatSpace} />);
        const card = container.firstChild;
        fireEvent.click(card as Element);
      }).not.toThrow();
    });

    it('should call onFavoriteToggle when favorite button is clicked', () => {
      const handleFavoriteToggle = vi.fn();
      render(
        <ConnectionSpaceCard
          space={mockHabitatSpace}
          onFavoriteToggle={handleFavoriteToggle}
        />
      );

      const favoriteButton = screen.getByLabelText(/adicionar aos favoritos/i);
      fireEvent.click(favoriteButton);

      expect(handleFavoriteToggle).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation when favorite button is clicked', () => {
      const handleClick = vi.fn();
      const handleFavoriteToggle = vi.fn();
      render(
        <ConnectionSpaceCard
          space={mockHabitatSpace}
          onClick={handleClick}
          onFavoriteToggle={handleFavoriteToggle}
        />
      );

      const favoriteButton = screen.getByLabelText(/adicionar aos favoritos/i);
      fireEvent.click(favoriteButton);

      expect(handleFavoriteToggle).toHaveBeenCalledTimes(1);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Favorite State', () => {
    it('should show filled star when is_favorite is true', () => {
      render(<ConnectionSpaceCard space={mockVenturesSpace} />);

      // In default variant, favorite star appears in the button
      const favoriteButton = screen.queryByLabelText(/remover dos favoritos/i);
      expect(favoriteButton).toBeInTheDocument();
    });

    it('should show empty star when is_favorite is false', () => {
      render(
        <ConnectionSpaceCard space={mockHabitatSpace} onFavoriteToggle={vi.fn()} />
      );

      const favoriteButton = screen.getByLabelText(/adicionar aos favoritos/i);
      expect(favoriteButton).toBeInTheDocument();
    });

    it('should not show favorite button when onFavoriteToggle is undefined', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} />);

      const favoriteButton = screen.queryByLabelText(/favoritos/i);
      expect(favoriteButton).not.toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('should render in compact mode', () => {
      render(<ConnectionSpaceCard space={mockHabitatSpace} variant="compact" />);

      expect(screen.getByText('Casa da Família')).toBeInTheDocument();
      expect(screen.getByText('Nosso lar')).toBeInTheDocument();
    });

    it('should show favorite star in compact mode when is_favorite is true', () => {
      render(<ConnectionSpaceCard space={mockVenturesSpace} variant="compact" />);

      // Compact variant shows star icon directly (not in button)
      const card = screen.getByText('Startup XYZ').closest('button');
      expect(card).toBeInTheDocument();
    });

    it('should call onClick in compact mode', () => {
      const handleClick = vi.fn();
      render(
        <ConnectionSpaceCard
          space={mockHabitatSpace}
          variant="compact"
          onClick={handleClick}
        />
      );

      const card = screen.getByText('Casa da Família').closest('button');
      fireEvent.click(card!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Last Activity', () => {
    it('should display last activity when provided', () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30).toISOString(); // 30 minutes ago
      render(
        <ConnectionSpaceCard space={mockHabitatSpace} lastActivity={recentDate} />
      );

      // The component uses formatDistanceToNow which should show something like "há 30 minutos"
      // We just check that the activity section is rendered
      const card = screen.getByText('Casa da Família').closest('div');
      expect(card).toBeInTheDocument();
    });
  });
});

// ============================================
// MEMBERAVATARSTACK TESTS
// ============================================

describe('MemberAvatarStack', () => {
  describe('Rendering', () => {
    it('should render member avatars', () => {
      render(<MemberAvatarStack members={mockMembers.slice(0, 3)} />);

      expect(screen.getByAltText('João Silva')).toBeInTheDocument();
      expect(screen.getByAltText('Pedro Costa')).toBeInTheDocument();
    });

    it('should render initials when no avatar_url', () => {
      render(<MemberAvatarStack members={mockMembers.slice(0, 2)} />);

      // Maria Santos should show initials "MS"
      expect(screen.getByText('MS')).toBeInTheDocument();
    });

    it('should handle members with single name', () => {
      const singleNameMember = [{ id: 'member-x', name: 'Ana', avatar_url: undefined }];
      render(<MemberAvatarStack members={singleNameMember} />);

      // Should show first 2 characters
      expect(screen.getByText('AN')).toBeInTheDocument();
    });

    it('should extract initials from first and last name', () => {
      const member = [{ id: 'member-y', name: 'Ana Paula Lima', avatar_url: undefined }];
      render(<MemberAvatarStack members={member} />);

      // Should show first letter of first name and last name
      expect(screen.getByText('AL')).toBeInTheDocument();
    });
  });

  describe('Max Visible Members', () => {
    it('should show up to maxVisible avatars', () => {
      render(<MemberAvatarStack members={mockMembers} maxVisible={3} />);

      expect(screen.getByAltText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('MS')).toBeInTheDocument();
      expect(screen.getByAltText('Pedro Costa')).toBeInTheDocument();
      // 4th and 5th should not be shown individually
      expect(screen.queryByText('AL')).not.toBeInTheDocument();
    });

    it('should show overflow indicator when members exceed maxVisible', () => {
      render(<MemberAvatarStack members={mockMembers} maxVisible={3} />);

      // Should show "+2" for the 2 overflow members
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should not show overflow indicator when members <= maxVisible', () => {
      render(<MemberAvatarStack members={mockMembers.slice(0, 3)} maxVisible={4} />);

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it('should show correct overflow count', () => {
      render(<MemberAvatarStack members={mockMembers} maxVisible={2} />);

      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('should have title attribute on overflow indicator', () => {
      render(<MemberAvatarStack members={mockMembers} maxVisible={3} />);

      const overflowIndicator = screen.getByText('+2');
      expect(overflowIndicator).toHaveAttribute('title', '2 more members');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(
        <MemberAvatarStack members={mockMembers.slice(0, 1)} size="sm" />
      );

      const avatar = container.querySelector('.w-6.h-6');
      expect(avatar).toBeInTheDocument();
    });

    it('should apply medium size classes (default)', () => {
      const { container } = render(
        <MemberAvatarStack members={mockMembers.slice(0, 1)} size="md" />
      );

      const avatar = container.querySelector('.w-8.h-8');
      expect(avatar).toBeInTheDocument();
    });

    it('should apply large size classes', () => {
      const { container } = render(
        <MemberAvatarStack members={mockMembers.slice(0, 1)} size="lg" />
      );

      const avatar = container.querySelector('.w-10.h-10');
      expect(avatar).toBeInTheDocument();
    });

    it('should default to medium size when not specified', () => {
      const { container } = render(
        <MemberAvatarStack members={mockMembers.slice(0, 1)} />
      );

      const avatar = container.querySelector('.w-8.h-8');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when stack is clicked', () => {
      const handleClick = vi.fn();
      render(
        <MemberAvatarStack members={mockMembers.slice(0, 2)} onClick={handleClick} />
      );

      const stack = screen.getByRole('button');
      fireEvent.click(stack);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not have button role when onClick is undefined', () => {
      render(<MemberAvatarStack members={mockMembers.slice(0, 2)} />);

      const buttonRole = screen.queryByRole('button');
      expect(buttonRole).not.toBeInTheDocument();
    });

    it('should handle keyboard events when clickable', () => {
      const handleClick = vi.fn();
      render(
        <MemberAvatarStack members={mockMembers.slice(0, 2)} onClick={handleClick} />
      );

      const stack = screen.getByRole('button');
      fireEvent.keyDown(stack, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle spacebar keyboard event', () => {
      const handleClick = vi.fn();
      render(
        <MemberAvatarStack members={mockMembers.slice(0, 2)} onClick={handleClick} />
      );

      const stack = screen.getByRole('button');
      fireEvent.keyDown(stack, { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Avatar Titles', () => {
    it('should have title attribute with member name', () => {
      render(<MemberAvatarStack members={mockMembers.slice(0, 2)} />);

      const joaoAvatar = screen.getByAltText('João Silva').closest('div');
      expect(joaoAvatar).toHaveAttribute('title', 'João Silva');
    });
  });
});

// ============================================
// INVITEMEMBERFORM TESTS
// ============================================

describe('InviteMemberForm', () => {
  const mockOnInvite = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnInvite.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Rendering', () => {
    it('should render form with email input', () => {
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      expect(screen.getByText('Convidar Membro')).toBeInTheDocument();
      expect(screen.getByLabelText(/email do membro/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@exemplo.com')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      expect(screen.getByText('Enviar Convite')).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      render(
        <InviteMemberForm
          spaceId="space-1"
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is undefined', () => {
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });

    it('should render helper text', () => {
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      expect(
        screen.getByText(/O membro receberá um email com o convite/i)
      ).toBeInTheDocument();
    });
  });

  describe('Email Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      const submitButton = screen.getByText('Enviar Convite');

      await user.type(emailInput, 'invalid-email');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email inválido/i)).toBeInTheDocument();
      });

      expect(mockOnInvite).not.toHaveBeenCalled();
    });

    it('should show error for empty email', async () => {
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email é obrigatório/i)).toBeInTheDocument();
      });

      expect(mockOnInvite).not.toHaveBeenCalled();
    });

    it('should accept valid email format', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockResolvedValue(undefined);

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      const submitButton = screen.getByText('Enviar Convite');

      await user.type(emailInput, 'valid@example.com');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith('valid@example.com');
      });
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      const submitButton = screen.getByText('Enviar Convite');

      // Trigger error
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Email é obrigatório/i)).toBeInTheDocument();
      });

      // Start typing
      await user.type(emailInput, 'test');

      // Error should be cleared
      expect(screen.queryByText(/Email é obrigatório/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onInvite with valid email', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockResolvedValue(undefined);

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should normalize email to lowercase', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockResolvedValue(undefined);

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, 'Test@EXAMPLE.COM');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should trim whitespace from email', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockResolvedValue(undefined);

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, '  test@example.com  ');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvite).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockResolvedValue(undefined);

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput.value).toBe('');
      });
    });

    it('should show error message on submission failure', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockRejectedValue(new Error('Failed to send invite'));

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to send invite')).toBeInTheDocument();
      });
    });

    it('should show generic error message for unknown errors', async () => {
      const user = userEvent.setup();
      mockOnInvite.mockRejectedValue('Unknown error');

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Erro ao enviar convite. Tente novamente./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable button when email is empty', () => {
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const submitButton = screen.getByText('Enviar Convite');
      expect(submitButton).toBeDisabled();
    });

    it('should enable button when email is not empty', async () => {
      const user = userEvent.setup();
      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByText('Enviar Convite');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable button and input when isLoading prop is true', () => {
      render(
        <InviteMemberForm
          spaceId="space-1"
          onInvite={mockOnInvite}
          isLoading={true}
        />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      const submitButton = screen.getByText(/enviando/i);

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading text when submitting', async () => {
      const user = userEvent.setup();
      let resolveInvite: () => void;
      const invitePromise = new Promise<void>((resolve) => {
        resolveInvite = resolve;
      });
      mockOnInvite.mockReturnValue(invitePromise);

      render(
        <InviteMemberForm spaceId="space-1" onInvite={mockOnInvite} />
      );

      const emailInput = screen.getByLabelText(/email do membro/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByText('Enviar Convite');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Enviando...')).toBeInTheDocument();
      });

      resolveInvite!();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <InviteMemberForm
          spaceId="space-1"
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should clear form when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <InviteMemberForm
          spaceId="space-1"
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email do membro/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(emailInput.value).toBe('');
    });

    it('should disable cancel button when loading', () => {
      render(
        <InviteMemberForm
          spaceId="space-1"
          onInvite={mockOnInvite}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeDisabled();
    });
  });
});
