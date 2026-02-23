/**
 * EF_HomeScreen - World/child selection grid
 *
 * Entry point for EraForge. Shows available worlds and children,
 * with inline creation forms for worlds and child profiles.
 * Uses Framer Motion for entrance animations and card hover effects.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  pageTransitionVariants,
  staggerContainer,
  staggerItem,
  cardElevationVariants,
} from '@/lib/animations/ceramic-motion';
import { EF_NavHeader } from './EF_NavHeader';
import { ERA_CONFIG } from '../types/eraforge.types';
import type { World, ChildProfile, Era, WorldCreateInput, ChildProfileCreateInput } from '../types/eraforge.types';

const ERA_OPTIONS = Object.entries(ERA_CONFIG) as [Era, { label: string; icon: string; color: string; period: string }][];

const AVATAR_EMOJIS = ['🧒', '👦', '👧', '🧒🏻', '👦🏽', '👧🏾', '🦸', '🧙', '🐉', '🦊', '🐺', '🦁', '🦄', '🐼', '🐵', '🦋'];

interface EF_HomeScreenProps {
  worlds: World[];
  children: ChildProfile[];
  selectedWorld?: World | null;
  onSelectWorld: (world: World) => void;
  onSelectChild: (child: ChildProfile) => void;
  onCreateWorld: (input: WorldCreateInput) => Promise<void>;
  onCreateChild?: (input: ChildProfileCreateInput) => Promise<void>;
  loading?: boolean;
  isCreating?: boolean;
  onBack?: () => void;
  onParentDashboard?: () => void;
}

export function EF_HomeScreen({
  worlds,
  children: childProfiles,
  selectedWorld,
  onSelectWorld,
  onSelectChild,
  onCreateWorld,
  onCreateChild,
  loading = false,
  isCreating = false,
  onBack,
  onParentDashboard,
}: EF_HomeScreenProps) {
  const [showWorldForm, setShowWorldForm] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [worldName, setWorldName] = useState('');
  const [worldEra, setWorldEra] = useState<Era>('stone_age');
  const [childName, setChildName] = useState('');
  const [childEmoji, setChildEmoji] = useState('🧒');
  const [childBirthYear, setChildBirthYear] = useState('');

  const handleSubmitWorld = async () => {
    if (!worldName.trim()) return;
    await onCreateWorld({ name: worldName.trim(), current_era: worldEra });
    setWorldName('');
    setWorldEra('stone_age');
    setShowWorldForm(false);
  };

  const handleSubmitChild = async () => {
    if (!childName.trim() || !onCreateChild) return;
    await onCreateChild({
      display_name: childName.trim(),
      avatar_emoji: childEmoji,
      birth_year: childBirthYear ? parseInt(childBirthYear, 10) : undefined,
    });
    setChildName('');
    setChildEmoji('🧒');
    setChildBirthYear('');
    setShowChildForm(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-ceramic-base">
      <EF_NavHeader
        title="EraForge"
        onBack={onBack}
        onParentDashboard={onParentDashboard}
        showParentAccess={!!onParentDashboard}
      />
      <motion.div
        className="p-6 space-y-8 flex-1"
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
      >
      {/* Subtitle */}
      <p className="text-ceramic-text-secondary text-center -mt-2">
        Escolha um mundo para explorar
      </p>

      {/* Children Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ceramic-text-primary font-fredoka">
            Jogadores
          </h2>
          {onCreateChild && (
            <button
              onClick={() => setShowChildForm(v => !v)}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              aria-label="Adicionar jogador"
            >
              + Adicionar
            </button>
          )}
        </div>

        {/* Child creation form */}
        <AnimatePresence>
          {showChildForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-ceramic-card shadow-ceramic-emboss space-y-3">
                <input
                  type="text"
                  placeholder="Nome do jogador"
                  value={childName}
                  onChange={e => setChildName(e.target.value)}
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-lg bg-ceramic-cool shadow-ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 border-none outline-none text-sm"
                  autoFocus
                />
                <div>
                  <p className="text-xs text-ceramic-text-secondary mb-1">Avatar</p>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setChildEmoji(emoji)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          childEmoji === emoji
                            ? 'bg-amber-100 ring-2 ring-amber-400 scale-110'
                            : 'bg-ceramic-cool hover:bg-ceramic-cool-hover'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="Ano de nascimento (opcional)"
                  value={childBirthYear}
                  onChange={e => setChildBirthYear(e.target.value)}
                  min={2005}
                  max={2025}
                  className="w-full px-3 py-2 rounded-lg bg-ceramic-cool shadow-ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 border-none outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChildForm(false)}
                    className="flex-1 py-2 text-sm text-ceramic-text-secondary bg-ceramic-cool rounded-lg hover:bg-ceramic-cool-hover transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitChild}
                    disabled={!childName.trim() || isCreating}
                    className="flex-1 py-2 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? 'Criando...' : 'Criar Jogador'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {childProfiles.length > 0 ? (
          <motion.div
            className="flex gap-3 overflow-x-auto pb-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {childProfiles.map(child => (
              <motion.button
                key={child.id}
                variants={staggerItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectChild(child)}
                aria-label={`Jogador: ${child.display_name}`}
                className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl bg-ceramic-card shadow-ceramic-emboss"
              >
                <div className="w-12 h-12 rounded-full bg-ceramic-cool flex items-center justify-center text-2xl">
                  {child.avatar_emoji || '👤'}
                </div>
                <span className="text-sm font-medium text-ceramic-text-primary whitespace-nowrap">
                  {child.display_name}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : !showChildForm ? (
          <div className="text-center py-4 bg-ceramic-cool rounded-xl">
            <p className="text-ceramic-text-secondary text-sm">
              Nenhum jogador criado ainda
            </p>
          </div>
        ) : null}
      </div>

      {/* Worlds Grid */}
      <div>
        <h2 className="text-lg font-semibold text-ceramic-text-primary mb-3 font-fredoka">
          Mundos
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 rounded-xl bg-ceramic-cool animate-pulse" />
            ))}
          </div>
        ) : worlds.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {worlds.map(world => {
              const eraConfig = ERA_CONFIG[world.current_era];
              const isSelected = selectedWorld?.id === world.id;
              return (
                <motion.button
                  key={world.id}
                  variants={cardElevationVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="pressed"
                  animate={isSelected ? 'selected' : 'rest'}
                  onClick={() => onSelectWorld(world)}
                  className={`p-4 rounded-xl bg-ceramic-card shadow-ceramic-emboss text-left ${
                    isSelected ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  <div className="text-2xl mb-2">🌍</div>
                  <h3 className="text-sm font-bold text-ceramic-text-primary truncate font-fredoka">
                    {world.name}
                  </h3>
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    {eraConfig.label}
                  </p>
                  <div className="mt-2 h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, world.era_progress)}%` }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : !showWorldForm ? (
          <div className="text-center py-8 bg-ceramic-cool rounded-xl">
            <p className="text-ceramic-text-secondary text-sm">
              Nenhum mundo criado ainda
            </p>
          </div>
        ) : null}
      </div>

      {/* World Creation Form */}
      <AnimatePresence mode="wait">
        {showWorldForm ? (
          <motion.div
            key="world-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-ceramic-card shadow-ceramic-emboss space-y-4"
          >
            <h3 className="text-base font-bold text-ceramic-text-primary font-fredoka">
              Novo Mundo
            </h3>
            <input
              type="text"
              placeholder="Nome do mundo (ex: Terra dos Dinossauros)"
              value={worldName}
              onChange={e => setWorldName(e.target.value)}
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg bg-ceramic-cool shadow-ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 border-none outline-none text-sm"
              autoFocus
            />
            <div>
              <p className="text-xs text-ceramic-text-secondary mb-2">Era inicial</p>
              <div className="grid grid-cols-3 gap-2">
                {ERA_OPTIONS.map(([era, config]) => (
                  <button
                    key={era}
                    onClick={() => setWorldEra(era)}
                    className={`px-2 py-2 rounded-lg text-xs text-center transition-all ${
                      worldEra === era
                        ? 'bg-amber-100 ring-2 ring-amber-400 text-amber-800 font-bold'
                        : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool-hover'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowWorldForm(false); setWorldName(''); }}
                className="flex-1 py-2 text-sm text-ceramic-text-secondary bg-ceramic-cool rounded-lg hover:bg-ceramic-cool-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitWorld}
                disabled={!worldName.trim() || isCreating}
                className="flex-1 py-2 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Criando...' : 'Criar Mundo'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="create-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowWorldForm(true)}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors font-fredoka"
          >
            + Criar Mundo
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hint: select world first, then child */}
      {selectedWorld && childProfiles.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-amber-600 font-medium animate-pulse">
            Agora escolha um jogador para entrar em &ldquo;{selectedWorld.name}&rdquo;
          </p>
        </div>
      )}
    </motion.div>
    </div>
  );
}
