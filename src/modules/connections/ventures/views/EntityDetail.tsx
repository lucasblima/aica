import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Building2, TrendingUp, Users, Calendar } from 'lucide-react';
import { useEntity } from '../hooks/useEntity';
import { useMetrics } from '../hooks/useMetrics';
import { useMilestones } from '../hooks/useMilestones';
import { useStakeholders } from '../hooks/useStakeholders';
import { VenturesEntity } from '../types';
import { cardElevationVariants } from '../../../../lib/animations/ceramic-motion';
import { MRRChart, FinanceOverviewCard, MilestoneTimeline, StakeholderGrid } from '../components';

/**
 * EntityDetail View
 *
 * Detail page for a specific venture with Ceramic Design System classes.
 * Includes header with venture name, metrics dashboard, team section,
 * milestones timeline, and financial overview.
 */
export function EntityDetail() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Use correct hook for single entity
  const { entity, loading, error, updateEntity } = useEntity(entityId);

  const { currentMetrics, metrics: metricsHistory = [] } = useMetrics(entityId || '');
  const { milestones = [] } = useMilestones(entityId || '');
  const { stakeholders = [] } = useStakeholders(entityId || '');

  // Safe array references with fallbacks
  const safeMetricsHistory = metricsHistory || [];
  const safeMilestones = milestones || [];
  const safeStakeholders = stakeholders || [];

  const [formData, setFormData] = useState<Partial<VenturesEntity>>(entity || {});

  useEffect(() => {
    if (entity) {
      setFormData(entity);
    }
  }, [entity]);

  const handleSave = async () => {
    if (!entity) return;

    try {
      await updateEntity(entity.id, formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating entity:', err);
    }
  };

  const handleCancel = () => {
    setFormData(entity || {});
    setIsEditing(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-ceramic-accent border-t-transparent" />
          <p className="mt-4 text-sm text-ceramic-text-secondary font-medium">Carregando venture...</p>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !entity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-12 text-center max-w-md">
          <div className="ceramic-concave w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-ceramic-text-secondary" />
          </div>
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Venture não encontrada
          </h2>
          <p className="text-sm text-ceramic-text-secondary mb-6">
            A venture que você está procurando não existe ou foi removida.
          </p>
          <motion.button
            onClick={() => navigate(-1)}
            className="ceramic-card px-6 py-3 inline-flex items-center gap-2"
            variants={cardElevationVariants}
            initial="rest"
            whileHover="hover"
            whileTap="pressed"
          >
            <ArrowLeft className="w-5 h-5 text-ceramic-accent" />
            <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
              Voltar
            </span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Venture Name */}
        <div className="ceramic-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => navigate(-1)}
                className="ceramic-inset p-3 rounded-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 text-ceramic-text-primary" />
              </motion.button>
              <div>
                <h1 className="text-3xl font-bold text-ceramic-text-primary mb-1">
                  {entity.trading_name || entity.legal_name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ceramic-text-secondary uppercase tracking-wider">
                    {entity.entity_type || 'Venture'}
                  </span>
                  {entity.sector && (
                    <>
                      <span className="text-ceramic-text-secondary">•</span>
                      <span className="text-sm text-ceramic-text-secondary">
                        {entity.sector}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Edit/Save Controls */}
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <motion.button
                  onClick={() => setIsEditing(true)}
                  className="ceramic-card px-6 py-3 flex items-center gap-2"
                  variants={cardElevationVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="pressed"
                >
                  <Edit2 className="w-5 h-5 text-ceramic-accent" />
                  <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
                    Editar
                  </span>
                </motion.button>
              ) : (
                <>
                  <motion.button
                    onClick={handleCancel}
                    className="ceramic-card px-6 py-3 flex items-center gap-2"
                    variants={cardElevationVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="pressed"
                  >
                    <X className="w-5 h-5 text-ceramic-text-secondary" />
                    <span className="text-sm font-semibold text-ceramic-text-secondary uppercase tracking-wider">
                      Cancelar
                    </span>
                  </motion.button>
                  <motion.button
                    onClick={handleSave}
                    className="ceramic-card px-6 py-3 flex items-center gap-2"
                    variants={cardElevationVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="pressed"
                  >
                    <Save className="w-5 h-5 text-ceramic-accent" />
                    <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
                      Salvar
                    </span>
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Dashboard Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FinanceOverviewCard metrics={currentMetrics} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MRRChart metricsHistory={safeMetricsHistory} />
          </motion.div>
        </div>

        {/* Team Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="ceramic-inset p-2 rounded-full">
              <Users className="w-5 h-5 text-ceramic-accent" />
            </div>
            <h2 className="text-xl font-bold text-ceramic-text-primary uppercase tracking-wider">
              Equipe
            </h2>
          </div>
          <StakeholderGrid stakeholders={safeStakeholders} entityId={entity.id} />
        </motion.div>

        {/* Milestones Timeline */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="ceramic-inset p-2 rounded-full">
              <Calendar className="w-5 h-5 text-ceramic-accent" />
            </div>
            <h2 className="text-xl font-bold text-ceramic-text-primary uppercase tracking-wider">
              Milestones
            </h2>
          </div>
          <MilestoneTimeline milestones={safeMilestones} entityId={entity.id} />
        </motion.div>

        {/* Entity Details Form (Collapsible) */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="ceramic-inset p-2 rounded-full">
                <Building2 className="w-5 h-5 text-ceramic-accent" />
              </div>
              <h2 className="text-xl font-bold text-ceramic-text-primary uppercase tracking-wider">
                Detalhes da Empresa
              </h2>
            </div>

            <div className="ceramic-card p-6 space-y-6">
              {/* Legal Information */}
              <section>
                <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider mb-4">
                  Informações Legais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Razão Social"
                    value={formData.legal_name || ''}
                    onChange={(value) => setFormData({ ...formData, legal_name: value })}
                    disabled={!isEditing}
                    required
                  />
                  <FormField
                    label="Nome Fantasia"
                    value={formData.trading_name || ''}
                    onChange={(value) => setFormData({ ...formData, trading_name: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="CNPJ"
                    value={formData.cnpj || ''}
                    onChange={(value) => setFormData({ ...formData, cnpj: value })}
                    disabled={!isEditing}
                  />
                  <FormSelect
                    label="Tipo de Entidade"
                    value={formData.entity_type || ''}
                    onChange={(value) => setFormData({ ...formData, entity_type: value as any })}
                    disabled={!isEditing}
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'MEI', label: 'MEI' },
                      { value: 'EIRELI', label: 'EIRELI' },
                      { value: 'LTDA', label: 'LTDA' },
                      { value: 'SA', label: 'SA' },
                      { value: 'SLU', label: 'SLU' },
                      { value: 'STARTUP', label: 'STARTUP' },
                      { value: 'NONPROFIT', label: 'NONPROFIT' },
                    ]}
                  />
                </div>
              </section>

              {/* Contact Information */}
              <section>
                <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider mb-4">
                  Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    label="Email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(value) => setFormData({ ...formData, email: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="Telefone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="Website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(value) => setFormData({ ...formData, website: value })}
                    disabled={!isEditing}
                  />
                </div>
              </section>

              {/* Address */}
              <section>
                <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider mb-4">
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      label="Endereço"
                      value={formData.address_line1 || ''}
                      onChange={(value) => setFormData({ ...formData, address_line1: value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <FormField
                    label="Cidade"
                    value={formData.city || ''}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="Estado"
                    value={formData.state || ''}
                    onChange={(value) => setFormData({ ...formData, state: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="CEP"
                    value={formData.postal_code || ''}
                    onChange={(value) => setFormData({ ...formData, postal_code: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="País"
                    value={formData.country || ''}
                    onChange={(value) => setFormData({ ...formData, country: value })}
                    disabled={!isEditing}
                  />
                </div>
              </section>

              {/* Business Profile */}
              <section>
                <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider mb-4">
                  Perfil
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Data de Fundação"
                    type="date"
                    value={formData.founded_at || ''}
                    onChange={(value) => setFormData({ ...formData, founded_at: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="Setor"
                    value={formData.sector || ''}
                    onChange={(value) => setFormData({ ...formData, sector: value })}
                    disabled={!isEditing}
                  />
                  <FormField
                    label="Subsetor"
                    value={formData.subsector || ''}
                    onChange={(value) => setFormData({ ...formData, subsector: value })}
                    disabled={!isEditing}
                  />
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * FormField - Ceramic-styled input field
 */
interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  type?: string;
}

function FormField({ label, value, onChange, disabled, required, type = 'text' }: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
        {label} {required && <span className="text-ceramic-negative">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-2xl
          text-sm text-ceramic-text-primary
          border-none outline-none
          transition-all duration-200
          ${disabled
            ? 'ceramic-inset-shallow bg-ceramic-base cursor-not-allowed'
            : 'ceramic-card focus:shadow-ceramic-elevated'
          }
        `}
      />
    </div>
  );
}

/**
 * FormSelect - Ceramic-styled select field
 */
interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
}

function FormSelect({ label, value, onChange, disabled, options }: FormSelectProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-2xl
          text-sm text-ceramic-text-primary
          border-none outline-none
          transition-all duration-200
          ${disabled
            ? 'ceramic-inset-shallow bg-ceramic-base cursor-not-allowed'
            : 'ceramic-card focus:shadow-ceramic-elevated'
          }
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
