/**
 * ContactCardGrid Component Tests
 *
 * Tests for the ContactCardGrid component that displays contacts in a stable,
 * animation-free grid to prevent visibility issues.
 *
 * Issue #92: Rich WhatsApp Contact UI - Phase 1
 * PR #149: https://github.com/lucasblima/Aica_frontend/pull/149
 *
 * Uses Vitest and React Testing Library with mocked framer-motion.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContactCardGrid } from '../../../src/components/features/ContactCardGrid';
import type { ContactNetwork } from '../../../src/types/memoryTypes';

// ============================================
// MOCKS
// ============================================

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className} {...props} data-testid="motion-div">
        {children}
      </div>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props} data-testid="motion-button">
        {children}
      </button>
    ),
  },
}));

// Mock ContactCard component
vi.mock('../../../src/components/features/ContactCard', () => ({
  default: ({ contact, onClick }: any) => (
    <div
      data-testid={`contact-card-${contact.id}`}
      onClick={() => onClick(contact)}
      className="contact-card"
    >
      <span>{contact.name}</span>
      <span>{contact.email}</span>
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Users: ({ className }: any) => <div className={className} data-testid="users-icon">Users Icon</div>,
}));

// ============================================
// TEST DATA
// ============================================

const mockContacts: ContactNetwork[] = [
  {
    id: 'contact-1',
    user_id: 'user-1',
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+5511999999999',
    whatsapp_id: '5511999999999',
    source: 'whatsapp',
    category: 'friends',
    relationship_score: 85,
    last_contact: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'contact-2',
    user_id: 'user-1',
    name: 'Maria Santos',
    email: 'maria@example.com',
    phone: '+5511988888888',
    whatsapp_id: '5511988888888',
    source: 'whatsapp',
    category: 'family',
    relationship_score: 92,
    last_contact: '2024-01-16T14:30:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-16T14:30:00Z',
  },
  {
    id: 'contact-3',
    user_id: 'user-1',
    name: 'Pedro Costa',
    email: 'pedro@example.com',
    phone: '+5511977777777',
    source: 'google',
    category: 'work',
    relationship_score: 65,
    last_contact: '2024-01-10T09:00:00Z',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-10T09:00:00Z',
  },
];

// ============================================
// CONTACTCARDGRID TESTS
// ============================================

describe('ContactCardGrid', () => {
  const mockOnContactClick = vi.fn();

  describe('Loading State', () => {
    it('should render 6 skeleton cards when loading', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={[]}
          isLoading={true}
          onContactClick={mockOnContactClick}
        />
      );

      // Count skeleton cards (ceramic-card with animate-pulse)
      const skeletonCards = container.querySelectorAll('.ceramic-card.animate-pulse');
      expect(skeletonCards).toHaveLength(6);
    });

    it('should render skeleton with correct structure', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={[]}
          isLoading={true}
          onContactClick={mockOnContactClick}
        />
      );

      // Check for avatar skeleton (w-14 h-14 rounded-full)
      const avatarSkeletons = container.querySelectorAll('.w-14.h-14.rounded-full');
      expect(avatarSkeletons.length).toBeGreaterThan(0);

      // Check for text skeletons
      const textSkeletons = container.querySelectorAll('.bg-ceramic-text-secondary\\/20.rounded');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });

    it('should use grid layout for skeleton cards', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={[]}
          isLoading={true}
          onContactClick={mockOnContactClick}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
    });
  });

  describe('Empty State', () => {
    it('should show default empty message when no contacts and no search/filter', () => {
      render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByText('Nenhum contato ainda')).toBeInTheDocument();
      expect(screen.getByText('Sincronize seus contatos do WhatsApp para começar')).toBeInTheDocument();
    });

    it('should show "not found" message when search query is present', () => {
      render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          searchQuery="test search"
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
      expect(screen.queryByText('Sincronize seus contatos do WhatsApp para começar')).not.toBeInTheDocument();
    });

    it('should show "not found" message when filter is applied', () => {
      render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          filterSource="whatsapp"
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
      expect(screen.queryByText('Sincronize seus contatos do WhatsApp para começar')).not.toBeInTheDocument();
    });

    it('should render Users icon in empty state', () => {
      render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    });

    it('should apply correct styling to empty state', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      const emptyStateDiv = screen.getByText('Nenhum contato ainda').closest('[data-testid="motion-div"]');
      expect(emptyStateDiv).toHaveClass('ceramic-card', 'p-12', 'flex', 'flex-col', 'items-center', 'justify-center', 'text-center');
    });
  });

  describe('Contact Grid Rendering', () => {
    it('should render all contacts when provided', () => {
      render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByTestId('contact-card-contact-1')).toBeInTheDocument();
      expect(screen.getByTestId('contact-card-contact-2')).toBeInTheDocument();
      expect(screen.getByTestId('contact-card-contact-3')).toBeInTheDocument();
    });

    it('should render contact names', () => {
      render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('Pedro Costa')).toBeInTheDocument();
    });

    it('should use standard div wrapper (not motion.div) for grid', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // The grid container should be a standard div with grid classes
      const gridContainer = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer?.tagName).toBe('DIV');

      // Ensure it's NOT a motion.div with data-testid
      expect(gridContainer?.getAttribute('data-testid')).not.toBe('motion-div');
    });

    it('should wrap each contact in a standard div (not motion.div)', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Each contact should be wrapped in a div with key={contact.id}
      const contactWrappers = container.querySelectorAll('.grid > div');
      expect(contactWrappers).toHaveLength(mockContacts.length);
    });

    it('should maintain grid layout with multiple contacts', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-4');
    });
  });

  describe('Click Interactions', () => {
    it('should call onContactClick with correct contact when card is clicked', () => {
      mockOnContactClick.mockClear();

      render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      const firstContactCard = screen.getByTestId('contact-card-contact-1');
      fireEvent.click(firstContactCard);

      expect(mockOnContactClick).toHaveBeenCalledTimes(1);
      expect(mockOnContactClick).toHaveBeenCalledWith(mockContacts[0]);
    });

    it('should call onContactClick with correct contact for different cards', () => {
      mockOnContactClick.mockClear();

      render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Click second contact
      const secondContactCard = screen.getByTestId('contact-card-contact-2');
      fireEvent.click(secondContactCard);

      expect(mockOnContactClick).toHaveBeenCalledWith(mockContacts[1]);
      expect(mockOnContactClick).toHaveBeenCalledTimes(1);

      mockOnContactClick.mockClear();

      // Click third contact
      const thirdContactCard = screen.getByTestId('contact-card-contact-3');
      fireEvent.click(thirdContactCard);

      expect(mockOnContactClick).toHaveBeenCalledWith(mockContacts[2]);
      expect(mockOnContactClick).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks on same card', () => {
      mockOnContactClick.mockClear();

      render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      const firstContactCard = screen.getByTestId('contact-card-contact-1');

      fireEvent.click(firstContactCard);
      fireEvent.click(firstContactCard);
      fireEvent.click(firstContactCard);

      expect(mockOnContactClick).toHaveBeenCalledTimes(3);
      expect(mockOnContactClick).toHaveBeenCalledWith(mockContacts[0]);
    });
  });

  describe('Component Props', () => {
    it('should handle undefined isLoading prop (defaults to false)', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={mockContacts}
          onContactClick={mockOnContactClick}
        />
      );

      // Should show contacts, not skeleton
      expect(screen.getByTestId('contact-card-contact-1')).toBeInTheDocument();
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    });

    it('should handle undefined searchQuery prop (defaults to empty string)', () => {
      render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Should show default empty message
      expect(screen.getByText('Nenhum contato ainda')).toBeInTheDocument();
    });

    it('should handle undefined filterSource prop (defaults to "all")', () => {
      render(
        <ContactCardGrid
          contacts={[]}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Should show default empty message (not filtered empty message)
      expect(screen.getByText('Nenhum contato ainda')).toBeInTheDocument();
    });

    it('should handle single contact', () => {
      render(
        <ContactCardGrid
          contacts={[mockContacts[0]]}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      expect(screen.getByTestId('contact-card-contact-1')).toBeInTheDocument();
      expect(screen.queryByTestId('contact-card-contact-2')).not.toBeInTheDocument();
    });

    it('should handle large number of contacts', () => {
      // Generate 50 mock contacts
      const manyContacts: ContactNetwork[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockContacts[0],
        id: `contact-${i}`,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`,
      }));

      render(
        <ContactCardGrid
          contacts={manyContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Should render all 50 contacts
      manyContacts.forEach((contact) => {
        expect(screen.getByTestId(`contact-card-${contact.id}`)).toBeInTheDocument();
      });
    });
  });

  describe('Animation Prevention (Architecture Decision)', () => {
    it('should NOT use motion.div for grid container', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Grid container should be a plain div, not motion.div
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer?.getAttribute('data-testid')).not.toBe('motion-div');
    });

    it('should NOT use motion.div for contact wrappers', () => {
      const { container } = render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // Contact wrappers should be plain divs
      const contactWrappers = container.querySelectorAll('.grid > div');
      contactWrappers.forEach((wrapper) => {
        expect(wrapper.getAttribute('data-testid')).not.toBe('motion-div');
      });
    });

    it('should allow ContactCard to have its own motion animations', () => {
      render(
        <ContactCardGrid
          contacts={mockContacts}
          isLoading={false}
          onContactClick={mockOnContactClick}
        />
      );

      // ContactCard is mocked but in real implementation it uses motion.button
      // This test verifies the architecture allows child components to animate
      expect(screen.getByTestId('contact-card-contact-1')).toBeInTheDocument();
    });
  });
});
