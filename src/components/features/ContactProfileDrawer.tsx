/**
 * ContactProfileDrawer — Unified cross-module contact profile view
 *
 * Shows a platform_contact's full profile with all module appearances:
 * - Header: avatar/initials, name, email, phone, status & source badges
 * - Quick actions: send invite, copy email, copy phone
 * - Module appearances: Studio, Flux, Connections, Grants
 * - Editable bio field
 * - Metadata footer
 *
 * Desktop: Slide-in from right (480px)
 * Mobile: Slide-in from bottom (85vh)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  User,
  Mic,
  Dumbbell,
  Users,
  FileText,
  Send,
  Copy,
  CheckCircle,
  Loader2,
  Check,
  Pencil,
} from 'lucide-react';
import { usePlatformContact } from '@/hooks/usePlatformContact';
import { useContactAppearances } from '@/hooks/useContactAppearances';
import { sendModuleInvite, updateContact } from '@/services/platformContactService';
import type { PlatformContact } from '@/services/platformContactService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ContactProfileDrawer');

// --- Types ---

interface ContactProfileDrawerProps {
  contactId: string | null; // null = closed
  onClose: () => void;
  onContactUpdated?: () => void;
}

// --- Constants ---

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  none: { label: 'Sem convite', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  pending: { label: 'Pendente', className: 'bg-amber-50 text-amber-700' },
  sent: { label: 'Enviado', className: 'bg-blue-50 text-blue-700' },
  connected: { label: 'Conectado', className: 'bg-emerald-50 text-emerald-700' },
};

const MODULE_CONFIG: Record<string, { label: string; color: string; bgLight: string; textColor: string }> = {
  studio: { label: 'Studio', color: '#8b5cf6', bgLight: 'bg-purple-50', textColor: 'text-purple-700' },
  flux: { label: 'Flux', color: '#f59e0b', bgLight: 'bg-amber-50', textColor: 'text-amber-700' },
  connections: { label: 'Connections', color: '#3b82f6', bgLight: 'bg-blue-50', textColor: 'text-blue-700' },
  grants: { label: 'Grants', color: '#10b981', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700' },
  manual: { label: 'Manual', color: '#6b7280', bgLight: 'bg-ceramic-cool', textColor: 'text-ceramic-text-secondary' },
};

const MODULE_ICONS: Record<string, React.ElementType> = {
  studio: Mic,
  flux: Dumbbell,
  connections: Users,
  grants: FileText,
};

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// --- Sub-components ---

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — silent fail
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-ceramic-cool transition-colors"
      title={`Copiar ${label}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-ceramic-success" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-ceramic-text-secondary" />
      )}
    </button>
  );
}

function ModuleSectionHeader({
  moduleKey,
  count,
}: {
  moduleKey: string;
  count: number;
}) {
  const Icon = MODULE_ICONS[moduleKey] || User;
  const config = MODULE_CONFIG[moduleKey] || MODULE_CONFIG.manual;

  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4" style={{ color: config.color }} />
      <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider">
        {config.label} ({count})
      </h3>
    </div>
  );
}

// --- Main Component ---

export function ContactProfileDrawer({
  contactId,
  onClose,
  onContactUpdated,
}: ContactProfileDrawerProps) {
  const isOpen = contactId !== null;
  const { contact, isLoading: contactLoading, refresh: refreshContact } = usePlatformContact(contactId);
  const { appearances, isLoading: appearancesLoading, refresh: refreshAppearances } = useContactAppearances(contactId);

  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Bio editing state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Reset bio state when contact changes (async data from usePlatformContact)
  useEffect(() => {
    if (contact) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setBioValue(contact.bio || '');
      setIsEditingBio(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [contact]);

  const handleSendInvite = async (module: string, portalPath: string) => {
    if (!contactId) return;
    setIsSendingInvite(true);
    setInviteError(null);

    const result = await sendModuleInvite(contactId, module, portalPath);
    setIsSendingInvite(false);

    if (!result.success) {
      setInviteError(result.error || 'Erro ao enviar convite');
    } else {
      refreshContact();
      refreshAppearances();
      onContactUpdated?.();
    }
  };

  const handleSaveBio = async () => {
    if (!contactId) return;
    setIsSavingBio(true);

    const { error } = await updateContact(contactId, { bio: bioValue.trim() || null });
    setIsSavingBio(false);

    if (!error) {
      setIsEditingBio(false);
      refreshContact();
      onContactUpdated?.();
    } else {
      log.error('Failed to save bio:', error);
    }
  };

  const isLoading = contactLoading || appearancesLoading;
  const statusInfo = STATUS_CONFIG[contact?.invitation_status || 'none'] || STATUS_CONFIG.none;
  const sourceConfig = MODULE_CONFIG[contact?.source_module || 'manual'] || MODULE_CONFIG.manual;
  const totalAppearances =
    appearances.episodes.length +
    appearances.athletes.length +
    appearances.connections.length +
    appearances.grants.length;
  const canSendInvite = contact?.email && contact.invitation_status !== 'connected';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-ceramic-base shadow-2xl z-50 flex flex-col overflow-hidden
                       max-md:top-auto max-md:left-0 max-md:max-w-none max-md:h-[85vh] max-md:rounded-t-2xl"
          >
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ceramic-border bg-ceramic-base">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                {contact?.avatar_url ? (
                  <img
                    src={contact.avatar_url}
                    alt={contact.display_name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                    style={{ backgroundColor: sourceConfig.color }}
                  >
                    {contact ? getInitials(contact.display_name) : '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-ceramic-text-primary truncate">
                    {contact?.display_name || 'Carregando...'}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sourceConfig.bgLight} ${sourceConfig.textColor}`}>
                      {sourceConfig.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Contact info + quick actions */}
              {contact && (
                <section className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-ceramic-text-primary">
                      <Mail className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                      <span className="truncate flex-1">{contact.email}</span>
                      <CopyButton text={contact.email} label="email" />
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-ceramic-text-primary">
                      <Phone className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                      <span className="flex-1">{contact.phone}</span>
                      <CopyButton text={contact.phone} label="telefone" />
                    </div>
                  )}

                  {/* Linked date */}
                  {contact.linked_at && (
                    <p className="text-xs text-ceramic-text-secondary">
                      Vinculado em {formatDate(contact.linked_at)}
                    </p>
                  )}
                </section>
              )}

              {/* Bio — editable */}
              {contact && (
                <section className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                      Bio
                    </h3>
                    {!isEditingBio && (
                      <button
                        onClick={() => setIsEditingBio(true)}
                        className="p-1 rounded hover:bg-ceramic-cool transition-colors"
                        title="Editar bio"
                      >
                        <Pencil className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                      </button>
                    )}
                  </div>
                  {isEditingBio ? (
                    <div className="space-y-2">
                      <textarea
                        value={bioValue}
                        onChange={(e) => setBioValue(e.target.value)}
                        maxLength={500}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-ceramic-border text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                        placeholder="Escreva uma bio..."
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ceramic-text-secondary">
                          {bioValue.length}/500
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setBioValue(contact.bio || '');
                              setIsEditingBio(false);
                            }}
                            className="px-2.5 py-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveBio}
                            disabled={isSavingBio}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors disabled:opacity-50"
                          >
                            {isSavingBio ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ceramic-text-secondary">
                      {contact.bio || 'Sem bio ainda.'}
                    </p>
                  )}
                </section>
              )}

              {/* Send invite (quick action) */}
              {canSendInvite && (
                <button
                  onClick={() => handleSendInvite(contact!.source_module, '/portal')}
                  disabled={isSendingInvite}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSendingInvite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar convite
                </button>
              )}

              {inviteError && (
                <div className="p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30">
                  <p className="text-xs text-ceramic-error">{inviteError}</p>
                </div>
              )}

              {/* Module appearances */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin" />
                </div>
              ) : (
                <>
                  {/* Studio episodes */}
                  {appearances.episodes.length > 0 && (
                    <section>
                      <ModuleSectionHeader moduleKey="studio" count={appearances.episodes.length} />
                      <div className="space-y-2">
                        {appearances.episodes.map((ep) => (
                          <div
                            key={ep.id}
                            className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border shadow-sm"
                          >
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              {ep.title}
                            </p>
                            {ep.episode_theme && (
                              <p className="text-xs text-purple-600 mt-0.5">{ep.episode_theme}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                                {ep.status === 'draft' ? 'Rascunho' : ep.status}
                              </span>
                              {ep.scheduled_date && (
                                <span className="text-xs text-ceramic-text-secondary">
                                  {formatDate(ep.scheduled_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Flux athletes */}
                  {appearances.athletes.length > 0 && (
                    <section>
                      <ModuleSectionHeader moduleKey="flux" count={appearances.athletes.length} />
                      <div className="space-y-2">
                        {appearances.athletes.map((ath) => (
                          <div
                            key={ath.id}
                            className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border shadow-sm"
                          >
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              {ath.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                                {ath.modality}
                              </span>
                              <span className="text-xs text-ceramic-text-secondary">{ath.level}</span>
                              <span
                                className={`text-xs ${
                                  ath.status === 'active' ? 'text-emerald-600' : 'text-ceramic-text-secondary'
                                }`}
                              >
                                {ath.status === 'active' ? 'Ativo' : ath.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Connections spaces */}
                  {appearances.connections.length > 0 && (
                    <section>
                      <ModuleSectionHeader moduleKey="connections" count={appearances.connections.length} />
                      <div className="space-y-2">
                        {appearances.connections.map((conn) => (
                          <div
                            key={conn.id}
                            className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border shadow-sm"
                          >
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              {conn.space_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                {conn.role}
                              </span>
                              {conn.joined_at && (
                                <span className="text-xs text-ceramic-text-secondary">
                                  Desde {formatDate(conn.joined_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Grants collaborations */}
                  {appearances.grants.length > 0 && (
                    <section>
                      <ModuleSectionHeader moduleKey="grants" count={appearances.grants.length} />
                      <div className="space-y-2">
                        {appearances.grants.map((grant) => (
                          <div
                            key={grant.id}
                            className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border shadow-sm"
                          >
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              {grant.project_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                {grant.role}
                              </span>
                              <span
                                className={`text-xs ${
                                  grant.status === 'active' ? 'text-emerald-600' : 'text-ceramic-text-secondary'
                                }`}
                              >
                                {grant.status === 'active' ? 'Ativo' : grant.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Empty state */}
                  {totalAppearances === 0 && !isLoading && (
                    <div className="text-center py-8">
                      <User className="w-8 h-8 text-ceramic-text-secondary mx-auto mb-2" />
                      <p className="text-sm text-ceramic-text-secondary">
                        Contato sem aparicoes em modulos ainda.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-ceramic-border bg-ceramic-base">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ceramic-text-secondary">
                  {contact ? `Criado em ${formatDate(contact.created_at)}` : ''}
                </span>
                {contact?.invitation_status === 'connected' && (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Conta vinculada</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
