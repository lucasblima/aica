/**
 * WhatsAppContactCard Component Unit Tests
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsAppContactCard } from '../WhatsAppContactCard';
import type { ContactNetwork } from '@/types/memoryTypes';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <article {...props}>{children}</article>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const createMockContact = (overrides: Partial<ContactNetwork> = {}): ContactNetwork => ({
  id: 'contact-1',
  user_id: 'user-1',
  name: 'Maria Silva',
  phone_number: '+5511999999999',
  whatsapp_phone: '+5511999999999',
  whatsapp_name: 'Maria Silva',
  whatsapp_profile_pic_url: 'https://example.com/profile.jpg',
  health_score: 75,
  relationship_type: 'friend',
  last_interaction_at: new Date().toISOString(),
  last_whatsapp_message_at: new Date().toISOString(),
  sentiment_trend: 'stable',
  ...overrides,
});

describe('WhatsAppContactCard', () => {
  const NOW = new Date('2026-01-25T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders contact name', () => {
      render(<WhatsAppContactCard contact={createMockContact()} />);

      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    });

    it('prefers whatsapp_name over name', () => {
      const contact = createMockContact({
        name: 'Maria',
        whatsapp_name: 'Maria WhatsApp',
      });

      render(<WhatsAppContactCard contact={contact} />);

      expect(screen.getByText('Maria WhatsApp')).toBeInTheDocument();
    });

    it('renders relationship type label', () => {
      render(<WhatsAppContactCard contact={createMockContact({ relationship_type: 'friend' })} />);

      expect(screen.getByText('Amigo')).toBeInTheDocument();
    });

    it('renders health score badge', () => {
      render(<WhatsAppContactCard contact={createMockContact({ health_score: 75 })} />);

      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('renders phone number', () => {
      render(<WhatsAppContactCard contact={createMockContact()} />);

      // Should format the phone number
      expect(screen.getByText(/99999-9999/)).toBeInTheDocument();
    });

    it('renders "Sem nome" for contacts without name', () => {
      const contact = createMockContact({ name: null, whatsapp_name: undefined });

      render(<WhatsAppContactCard contact={contact} />);

      expect(screen.getByText('Sem nome')).toBeInTheDocument();
    });
  });

  describe('last message timestamp', () => {
    it('renders relative time for last message', () => {
      const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const contact = createMockContact({ last_whatsapp_message_at: twoDaysAgo });

      render(<WhatsAppContactCard contact={contact} />);

      expect(screen.getByText(/2 dias/)).toBeInTheDocument();
    });

    it('does not render timestamp when not available', () => {
      const contact = createMockContact({
        last_whatsapp_message_at: undefined,
        last_interaction_at: undefined,
      });

      render(<WhatsAppContactCard contact={contact} />);

      expect(screen.queryByText(/Ultima mensagem/)).not.toBeInTheDocument();
    });
  });

  describe('quick actions', () => {
    it('renders chat button when onChatClick provided', () => {
      const handleChatClick = vi.fn();

      render(
        <WhatsAppContactCard
          contact={createMockContact()}
          onChatClick={handleChatClick}
        />
      );

      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('calls onChatClick when chat button clicked', () => {
      const handleChatClick = vi.fn();
      const contact = createMockContact();

      render(
        <WhatsAppContactCard
          contact={contact}
          onChatClick={handleChatClick}
        />
      );

      fireEvent.click(screen.getByText('Chat'));

      expect(handleChatClick).toHaveBeenCalledWith(contact);
    });

    it('renders favorite button when onFavoriteToggle provided', () => {
      const handleFavoriteToggle = vi.fn();

      render(
        <WhatsAppContactCard
          contact={createMockContact()}
          onFavoriteToggle={handleFavoriteToggle}
        />
      );

      expect(screen.getByLabelText(/favoritos/i)).toBeInTheDocument();
    });

    it('calls onFavoriteToggle when favorite button clicked', () => {
      const handleFavoriteToggle = vi.fn();
      const contact = createMockContact();

      render(
        <WhatsAppContactCard
          contact={contact}
          onFavoriteToggle={handleFavoriteToggle}
        />
      );

      fireEvent.click(screen.getByLabelText(/favoritos/i));

      expect(handleFavoriteToggle).toHaveBeenCalledWith(contact);
    });

    it('shows filled star when isFavorite is true', () => {
      render(
        <WhatsAppContactCard
          contact={createMockContact()}
          isFavorite={true}
          onFavoriteToggle={() => {}}
        />
      );

      const favoriteButton = screen.getByLabelText('Remover dos favoritos');
      expect(favoriteButton).toHaveClass('bg-yellow-100');
    });

    it('renders more button when onMoreClick provided', () => {
      const handleMoreClick = vi.fn();

      render(
        <WhatsAppContactCard
          contact={createMockContact()}
          onMoreClick={handleMoreClick}
        />
      );

      expect(screen.getByLabelText('Mais opcoes')).toBeInTheDocument();
    });

    it('stops propagation when action buttons clicked', () => {
      const handleClick = vi.fn();
      const handleChatClick = vi.fn();

      render(
        <WhatsAppContactCard
          contact={createMockContact()}
          onClick={handleClick}
          onChatClick={handleChatClick}
        />
      );

      fireEvent.click(screen.getByText('Chat'));

      expect(handleChatClick).toHaveBeenCalled();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('click handling', () => {
    it('calls onClick when card clicked', () => {
      const handleClick = vi.fn();
      const contact = createMockContact();

      render(<WhatsAppContactCard contact={contact} onClick={handleClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledWith(contact);
    });

    it('calls onClick on Enter key press', () => {
      const handleClick = vi.fn();
      const contact = createMockContact();

      render(<WhatsAppContactCard contact={contact} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledWith(contact);
    });
  });

  describe('variants', () => {
    it('renders compact variant with smaller size', () => {
      const { container } = render(
        <WhatsAppContactCard
          contact={createMockContact()}
          variant="compact"
        />
      );

      expect(container.firstChild).toHaveClass('p-3');
    });

    it('renders default variant with standard padding', () => {
      const { container } = render(
        <WhatsAppContactCard contact={createMockContact()} />
      );

      expect(container.firstChild).toHaveClass('p-4');
    });

    it('shows phone number in default variant', () => {
      render(<WhatsAppContactCard contact={createMockContact()} />);

      expect(screen.getByText(/99999-9999/)).toBeInTheDocument();
    });
  });

  describe('relationship type labels', () => {
    const relationshipTypes = [
      { type: 'colleague', label: 'Colega' },
      { type: 'client', label: 'Cliente' },
      { type: 'friend', label: 'Amigo' },
      { type: 'family', label: 'Familia' },
      { type: 'mentor', label: 'Mentor' },
      { type: 'mentee', label: 'Mentorado' },
      { type: 'vendor', label: 'Fornecedor' },
      { type: 'contact', label: 'Contato' },
      { type: 'group', label: 'Grupo' },
      { type: 'other', label: 'Outro' },
    ];

    relationshipTypes.forEach(({ type, label }) => {
      it(`renders "${label}" for relationship_type "${type}"`, () => {
        render(
          <WhatsAppContactCard
            contact={createMockContact({ relationship_type: type as any })}
          />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('renders "Contato" for unknown relationship type', () => {
      render(
        <WhatsAppContactCard
          contact={createMockContact({ relationship_type: undefined })}
        />
      );

      expect(screen.getByText('Contato')).toBeInTheDocument();
    });
  });

  describe('online status', () => {
    it('shows online indicator when synced', () => {
      const contact = createMockContact({ whatsapp_sync_status: 'synced' });

      render(<WhatsAppContactCard contact={contact} />);

      // ContactAvatar should receive isOnline=true
      // This is tested through the visual indicator
      expect(screen.getByLabelText('Online')).toBeInTheDocument();
    });

    it('shows offline indicator when not synced', () => {
      const contact = createMockContact({ whatsapp_sync_status: 'pending' });

      render(<WhatsAppContactCard contact={contact} />);

      expect(screen.getByLabelText('Offline')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label', () => {
      render(<WhatsAppContactCard contact={createMockContact()} />);

      expect(screen.getByLabelText('Contato: Maria Silva')).toBeInTheDocument();
    });

    it('has role="button"', () => {
      render(<WhatsAppContactCard contact={createMockContact()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('is focusable', () => {
      render(<WhatsAppContactCard contact={createMockContact()} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has aria-pressed on favorite button', () => {
      render(
        <WhatsAppContactCard
          contact={createMockContact()}
          isFavorite={true}
          onFavoriteToggle={() => {}}
        />
      );

      expect(screen.getByLabelText('Remover dos favoritos')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
  });
});
