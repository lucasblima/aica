import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Building2, TrendingUp, Users, Target, ArrowLeft, LayoutDashboard, Briefcase, X, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { useEntitiesBySpace } from '../hooks/useEntity';
import { useMetrics } from '../hooks/useMetrics';
import { useMilestones } from '../hooks/useMilestones';
import { useStakeholders } from '../hooks/useStakeholders';
import { entityService } from '../services/entityService';
import { formatCurrency, formatPercentage, calculateHealthStatus, type EntityType, type CreateEntityPayload } from '../types';
import { cardElevationVariants, staggerContainer, staggerItem } from '../../../../lib/animations/ceramic-motion';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('VenturesHome');

/**
 * VenturesHome View
 *
 * Main ventures listing/dashboard with ceramic-card styling.
 * Displays grid of venture cards, quick stats summary, and create new venture button.
 * Full CRUD: Create, Read, Update, Delete ventures entities.
 */
export function VenturesHome() {
  const navigate = useNavigate();
  const { spaceId: paramSpaceId } = useParams<{ spaceId: string }>();
  const spaceId = paramSpaceId || 'default-space';

  // CRUD Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch entity data - using correct hook for list of entities
  const { entities = [], loading: entitiesLoading, createEntity, refresh } = useEntitiesBySpace(spaceId);

  // Safe array reference with fallback
  const safeEntities = entities || [];

  // Create entity handler
  const handleCreateEntity = async (data: CreateEntityPayload) => {
    setIsCreating(true);
    try {
      await createEntity(data);
      setShowCreateModal(false);
    } catch (error) {
      log.error('Erro ao criar venture:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete entity handler
  const handleDeleteEntity = async (entityId: string) => {
    setIsDeleting(true);
    try {
      await entityService.deleteEntity(entityId);
      await refresh();
      setShowDeleteConfirm(null);
    } catch (error) {
      log.error('Erro ao deletar venture:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-ceramic-accent border-t-transparent" />
          <p className="mt-4 text-sm text-ceramic-text-secondary font-medium">Carregando ventures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Navigation - Following HabitatDashboard pattern */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/connections')}
            className="ceramic-inset p-3 rounded-full hover:bg-ceramic-base/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ceramic-text-primary" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-ceramic-text-primary">
              Ventures
            </h1>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              Motor de Criacao - Cockpit of Professional Ambition
            </p>
          </div>

          {/* Create New Venture Button */}
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="ceramic-card px-6 py-3 flex items-center gap-2"
            variants={cardElevationVariants}
            initial="rest"
            whileHover="hover"
            whileTap="pressed"
          >
            <Plus className="w-5 h-5 text-ceramic-accent" />
            <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
              Nova Venture
            </span>
          </motion.button>
        </div>

        {/* Navigation Tabs - Tactile ceramic states (concave = pressed/active) */}
        <div className="ceramic-tray flex gap-1.5 p-1.5 rounded-full mb-8 inline-flex">
          <motion.button
            className="flex items-center gap-2 px-5 py-2.5 ceramic-concave text-ceramic-text-primary rounded-full font-bold text-sm"
            whileTap={{ scale: 0.97 }}
            aria-selected="true"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="uppercase tracking-wide text-xs">Dashboard</span>
          </motion.button>
          <motion.button
            onClick={() => navigate('/connections/ventures/entities')}
            className="flex items-center gap-2 px-5 py-2.5 ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary rounded-full font-bold text-sm transition-colors"
            whileTap={{ scale: 0.97 }}
            aria-selected="false"
          >
            <Briefcase className="w-4 h-4" />
            <span className="uppercase tracking-wide text-xs">Entidades</span>
          </motion.button>
        </div>

        {/* Quick Stats Summary */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={Building2}
            label="Total Ventures"
            value={safeEntities.length.toString()}
            color="text-ceramic-accent"
          />
          <StatCard
            icon={TrendingUp}
            label="Active"
            value={safeEntities.filter(e => e.is_active).length.toString()}
            color="text-ceramic-positive"
          />
          <StatCard
            icon={Users}
            label="Team Members"
            value="0"
            color="text-ceramic-text-primary"
          />
          <StatCard
            icon={Target}
            label="Milestones"
            value="0"
            color="text-ceramic-text-primary"
          />
        </motion.div>

        {/* Grid of Venture Cards */}
        {safeEntities.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {safeEntities.map((entity) => (
              <VentureCard
                key={entity.id}
                entity={entity}
                onNavigate={(id) => navigate(`/connections/ventures/${spaceId}/entity/${id}`)}
                onEdit={(id) => navigate(`/connections/ventures/${spaceId}/entity/${id}/edit`)}
                onDelete={(id) => setShowDeleteConfirm(id)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Create Modal */}
      <CreateEntityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEntity}
        isLoading={isCreating}
        spaceId={spaceId}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteEntity(showDeleteConfirm)}
        isLoading={isDeleting}
        entityName={safeEntities.find(e => e.id === showDeleteConfirm)?.trading_name || safeEntities.find(e => e.id === showDeleteConfirm)?.legal_name || 'esta venture'}
      />
    </div>
  );
}

/**
 * StatCard - Quick stats summary card with ceramic styling
 */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      className="ceramic-card p-5 relative overflow-hidden"
      variants={staggerItem}
    >
      {/* Background decorative icon */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 icon-engraved">
        <Icon className={`w-full h-full ${color}`} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="ceramic-inset p-2 inline-flex mb-3">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="text-2xl font-bold text-ceramic-text-primary mb-1">
          {value}
        </div>
        <div className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * VentureCard - Individual venture card with metrics preview
 */
interface VentureCardProps {
  entity: any;
  onEdit: (entityId: string) => void;
  onDelete: (entityId: string) => void;
  onNavigate: (entityId: string) => void;
}

function VentureCard({ entity, onEdit, onDelete, onNavigate }: VentureCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { currentMetrics } = useMetrics(entity?.id);
  const { milestones = [] } = useMilestones(entity?.id);
  const { stakeholders = [] } = useStakeholders(entity?.id);

  // Safe array references with fallbacks - defensive programming
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const safeStakeholders = Array.isArray(stakeholders) ? stakeholders : [];

  // Early return if entity is invalid
  if (!entity?.id) {
    return null;
  }

  const healthStatus = calculateHealthStatus(currentMetrics?.runway_months);
  const activeMilestones = safeMilestones.filter(m => m.status === 'in_progress').length;

  return (
    <motion.div
      className="ceramic-card p-6 min-h-[240px] flex flex-col cursor-pointer relative group"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
      onClick={() => onNavigate(entity.id)}
    >
      {/* Action Menu Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 rounded-lg hover:bg-ceramic-base/50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="w-4 h-4 text-ceramic-text-secondary" />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 top-10 bg-ceramic-base rounded-lg shadow-lg border border-ceramic-border py-1 min-w-[140px] z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onEdit(entity.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-ceramic-text-primary hover:bg-ceramic-base/50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => {
                  onDelete(entity.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-ceramic-error hover:bg-ceramic-error/10 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 pr-8">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
            {entity.trading_name || entity.legal_name}
          </h3>
          <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
            {entity.entity_type || 'Venture'}
          </p>
        </div>

        {/* Health Badge */}
        <div className={`
          ceramic-inset px-3 py-1 rounded-full
          ${healthStatus === 'healthy' ? 'bg-ceramic-success/10' : ''}
          ${healthStatus === 'warning' ? 'bg-ceramic-warning/10' : ''}
          ${healthStatus === 'critical' ? 'bg-ceramic-error/10' : ''}
        `}>
          <span className={`
            text-xs font-bold
            ${healthStatus === 'healthy' ? 'text-ceramic-positive' : ''}
            ${healthStatus === 'warning' ? 'text-ceramic-accent' : ''}
            ${healthStatus === 'critical' ? 'text-ceramic-negative' : ''}
          `}>
            {healthStatus === 'healthy' ? 'OK' : healthStatus === 'warning' ? '!' : '!!'}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 space-y-3">
        {currentMetrics && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                MRR
              </span>
              <span className="text-sm font-bold text-ceramic-text-primary">
                {formatCurrency(currentMetrics.mrr)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                Runway
              </span>
              <span className="text-sm font-bold text-ceramic-text-primary">
                {currentMetrics.runway_months ? `${currentMetrics.runway_months}m` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                Gross Margin
              </span>
              <span className="text-sm font-bold text-ceramic-text-primary">
                {formatPercentage(currentMetrics.gross_margin_pct)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-ceramic-text-secondary/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {safeStakeholders.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {activeMilestones}
            </span>
          </div>
        </div>
        <span className="text-xs font-bold text-ceramic-accent uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalhes
        </span>
      </div>
    </motion.div>
  );
}

/**
 * EmptyState - No ventures created yet
 */
interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="ceramic-card p-12 text-center">
      <div className="ceramic-concave w-20 h-20 mx-auto mb-6 flex items-center justify-center">
        <Building2 className="w-10 h-10 text-ceramic-text-secondary" />
      </div>
      <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
        Nenhuma venture criada
      </h3>
      <p className="text-sm text-ceramic-text-secondary mb-6 max-w-md mx-auto">
        Configure sua primeira empresa ou projeto para comecar a acompanhar metricas, milestones e equipe.
      </p>
      <motion.button
        onClick={onCreateClick}
        className="ceramic-card px-6 py-3 inline-flex items-center gap-2"
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        whileTap="pressed"
      >
        <Plus className="w-5 h-5 text-ceramic-accent" />
        <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
          Criar primeira venture
        </span>
      </motion.button>
    </div>
  );
}

/**
 * CreateEntityModal - Modal for creating new venture entity
 */
interface CreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEntityPayload) => Promise<void>;
  isLoading: boolean;
  spaceId: string;
}

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'MEI', label: 'MEI - Microempreendedor Individual' },
  { value: 'EIRELI', label: 'EIRELI' },
  { value: 'LTDA', label: 'LTDA - Limitada' },
  { value: 'SA', label: 'S/A - Sociedade Anonima' },
  { value: 'SLU', label: 'SLU - Sociedade Limitada Unipessoal' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'NONPROFIT', label: 'Sem fins lucrativos' },
];

function CreateEntityModal({ isOpen, onClose, onSubmit, isLoading, spaceId }: CreateEntityModalProps) {
  const [formData, setFormData] = useState({
    legal_name: '',
    trading_name: '',
    entity_type: '' as EntityType | '',
    email: '',
    website: '',
    sector: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) return;

    await onSubmit({
      space_id: spaceId,
      legal_name: formData.legal_name.trim(),
      trading_name: formData.trading_name.trim() || undefined,
      entity_type: formData.entity_type || undefined,
      email: formData.email.trim() || undefined,
      website: formData.website.trim() || undefined,
      sector: formData.sector.trim() || undefined,
    });

    // Reset form
    setFormData({
      legal_name: '',
      trading_name: '',
      entity_type: '',
      email: '',
      website: '',
      sector: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-base w-full max-w-lg rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-ceramic-text-primary" />
            </div>
            <h2 className="text-xl font-bold text-ceramic-text-primary">Nova Venture</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Legal Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Razao Social *
            </label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              placeholder="Nome legal da empresa"
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
              required
              autoFocus
            />
          </div>

          {/* Trading Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Nome Fantasia
            </label>
            <input
              type="text"
              value={formData.trading_name}
              onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
              placeholder="Nome comercial"
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
            />
          </div>

          {/* Entity Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Tipo de Entidade
            </label>
            <select
              value={formData.entity_type}
              onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as EntityType })}
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
            >
              <option value="">Selecione...</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Sector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Setor
            </label>
            <input
              type="text"
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              placeholder="Ex: Tecnologia, Saude, Educacao"
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
            />
          </div>

          {/* Email & Website */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://empresa.com"
                className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 ceramic-card py-3 rounded-xl font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.legal_name.trim()}
              className="flex-1 ceramic-card py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-ceramic-base/30 border-t-ceramic-base rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Venture
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * DeleteConfirmModal - Confirmation modal for deleting entity
 */
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  entityName: string;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, isLoading, entityName }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-base w-full max-w-md rounded-2xl shadow-2xl p-6"
      >
        <div className="text-center">
          <div className="ceramic-concave w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-ceramic-error/10">
            <Trash2 className="w-8 h-8 text-ceramic-error" />
          </div>
          <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Excluir Venture?
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-6">
            Tem certeza que deseja excluir <strong>{entityName}</strong>? Esta acao nao pode ser desfeita.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 ceramic-card py-3 rounded-xl font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 ceramic-card py-3 rounded-xl bg-ceramic-error text-white font-bold hover:bg-ceramic-error/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
