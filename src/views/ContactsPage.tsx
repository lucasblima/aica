/**
 * ContactsPage — Unified contacts management page (/contatos)
 *
 * Lists all platform_contacts owned by the current user.
 * Supports filtering by module, invitation status, and text search.
 * Click on a contact opens the ContactProfileDrawer.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Plus, User, Users, X, Loader2, Mic, Dumbbell, Globe, Award, PenLine, Mail } from 'lucide-react';
import { usePlatformContacts } from '@/hooks/usePlatformContact';
import { findOrCreateContact } from '@/services/platformContactService';
import type { PlatformContact } from '@/services/platformContactService';
import { ContactProfileDrawer } from '@/components/features/ContactProfileDrawer';

// --- Module config ---

type SourceModule = PlatformContact['source_module'];
type InvitationStatus = PlatformContact['invitation_status'];

const MODULE_CONFIG: Record<SourceModule, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  studio: { label: 'Studio', color: 'text-purple-700', bg: 'bg-purple-50', icon: <Mic className="w-3.5 h-3.5" /> },
  flux: { label: 'Flux', color: 'text-amber-700', bg: 'bg-amber-50', icon: <Dumbbell className="w-3.5 h-3.5" /> },
  connections: { label: 'Connections', color: 'text-blue-700', bg: 'bg-blue-50', icon: <Globe className="w-3.5 h-3.5" /> },
  grants: { label: 'Grants', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <Award className="w-3.5 h-3.5" /> },
  manual: { label: 'Manual', color: 'text-ceramic-text-secondary', bg: 'bg-ceramic-cool', icon: <PenLine className="w-3.5 h-3.5" /> },
  email: { label: 'Email', color: 'text-red-700', bg: 'bg-red-50', icon: <Mail className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<InvitationStatus, { label: string; color: string; bg: string }> = {
  none: { label: 'Sem convite', color: 'text-ceramic-text-secondary', bg: 'bg-ceramic-cool' },
  pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50' },
  sent: { label: 'Enviado', color: 'text-blue-700', bg: 'bg-blue-50' },
  connected: { label: 'Conectado', color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const MODULE_FILTER_OPTIONS: { value: SourceModule | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'studio', label: 'Studio' },
  { value: 'flux', label: 'Flux' },
  { value: 'connections', label: 'Connections' },
  { value: 'grants', label: 'Grants' },
  { value: 'email', label: 'Email' },
  { value: 'manual', label: 'Manual' },
];

const STATUS_FILTER_OPTIONS: { value: InvitationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'connected', label: 'Conectados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'sent', label: 'Enviados' },
];

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

// --- New Contact Modal ---

interface NewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function NewContactModal({ isOpen, onClose, onCreated }: NewContactModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sourceModule, setSourceModule] = useState<SourceModule>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const { error: createError } = await findOrCreateContact(
      displayName.trim(),
      email.trim() || null,
      phone.trim() || null,
      sourceModule,
    );

    setIsSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }

    setDisplayName('');
    setEmail('');
    setPhone('');
    setSourceModule('manual');
    onCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ceramic-base rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-ceramic-text-primary">Novo Contato</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome completo"
              required
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-white text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@email.com"
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-white text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Telefone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-white text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Modulo de origem
            </label>
            <select
              value={sourceModule}
              onChange={(e) => setSourceModule(e.target.value as SourceModule)}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-white text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            >
              {MODULE_FILTER_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-ceramic-border text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Contato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Contact Card ---

interface ContactCardProps {
  contact: PlatformContact;
  onClick: () => void;
}

function ContactCard({ contact, onClick }: ContactCardProps) {
  const mod = MODULE_CONFIG[contact.source_module];
  const status = STATUS_CONFIG[contact.invitation_status];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-white border border-ceramic-border hover:shadow-md hover:scale-[1.01] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {contact.avatar_url ? (
          <img
            src={contact.avatar_url}
            alt={contact.display_name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-ceramic-cool flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-ceramic-text-secondary">
              {getInitials(contact.display_name)}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ceramic-text-primary truncate">
            {contact.display_name}
          </p>
          {contact.email && (
            <p className="text-xs text-ceramic-text-secondary truncate mt-0.5">
              {contact.email}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${mod.bg} ${mod.color}`}>
              {mod.icon}
              {mod.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// --- Main Page ---

export default function ContactsPage() {
  const { contacts, isLoading, error, refresh } = usePlatformContacts();

  // Filters
  const [moduleFilter, setModuleFilter] = useState<SourceModule | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Drawer
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // New contact modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openDrawer = useCallback((contact: PlatformContact) => {
    setSelectedContactId(contact.id);
  }, []);

  const closeDrawer = useCallback(() => {
    setSelectedContactId(null);
  }, []);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (moduleFilter !== 'all') {
      result = result.filter((c) => c.source_module === moduleFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.invitation_status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return result;
  }, [contacts, moduleFilter, statusFilter, search]);

  const hasActiveFilters = moduleFilter !== 'all' || statusFilter !== 'all' || search.trim() !== '';

  const clearFilters = () => {
    setModuleFilter('all');
    setStatusFilter('all');
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <div className="bg-white border-b border-ceramic-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ceramic-text-primary">Meus Contatos</h1>
                <p className="text-sm text-ceramic-text-secondary">
                  {isLoading
                    ? 'Carregando...'
                    : `${contacts.length} contato${contacts.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Contato</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ceramic-border bg-white text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-ceramic-cool"
            >
              <X className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          )}
        </div>

        {/* Module chips */}
        <div className="flex flex-wrap gap-2">
          {MODULE_FILTER_OPTIONS.map((opt) => {
            const isActive = moduleFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setModuleFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-ceramic-border text-ceramic-text-secondary hover:bg-ceramic-cool'
                }`}
              >
                {opt.label}
              </button>
            );
          })}

          <div className="w-px h-6 bg-ceramic-border self-center mx-1" />

          {/* Status chips */}
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-ceramic-border text-ceramic-text-secondary hover:bg-ceramic-cool'
                }`}
              >
                {opt.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-sm text-ceramic-text-secondary">Carregando contatos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-ceramic-text-primary font-medium mb-1">Erro ao carregar contatos</p>
            <p className="text-xs text-ceramic-text-secondary mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full bg-ceramic-cool flex items-center justify-center mb-3">
              <User className="w-6 h-6 text-ceramic-text-secondary" />
            </div>
            {hasActiveFilters ? (
              <>
                <p className="text-sm text-ceramic-text-primary font-medium mb-1">Nenhum contato encontrado</p>
                <p className="text-xs text-ceramic-text-secondary mb-4">Tente ajustar os filtros</p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg border border-ceramic-border text-ceramic-text-secondary hover:bg-ceramic-cool text-sm font-medium transition-colors"
                >
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ceramic-text-primary font-medium mb-1">Nenhum contato ainda</p>
                <p className="text-xs text-ceramic-text-secondary mb-4">
                  Adicione contatos manualmente ou use os modulos Studio, Flux, Connections ou Grants
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar primeiro contato
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => openDrawer(contact)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contact Profile Drawer */}
      <ContactProfileDrawer
        contactId={selectedContactId}
        onClose={closeDrawer}
        onContactUpdated={refresh}
      />

      {/* New Contact Modal */}
      <NewContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
