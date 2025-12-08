import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    User,
    ChevronRight,
    ChevronLeft,
    Calendar,
    MapPin,
    Hash,
    Sparkles,
    Loader2,
    Check,
    Clock,
    AlertCircle
} from 'lucide-react';
import { searchGuestProfile } from '../../../services/podcastProductionService';
import { supabase } from '../../../services/supabaseClient';

interface GuestProfile {
    name: string;
    fullName?: string;
    title?: string;
    imageUrl?: string;
    summary?: string;
}

interface WizardData {
    guestName: string;
    guestReference: string;
    confirmedProfile: GuestProfile | null;
    theme: string;
    themeMode: 'auto' | 'manual';
    season: string;
    location: string;
    scheduledDate: string;
    scheduledTime: string;
}

interface GuestIdentificationWizardProps {
    showId: string;
    onComplete: (data: WizardData, episodeId: string) => void;
    onCancel: () => void;
}

const LOCATIONS = [
    'Rádio Tupi',
    'Estúdio Remoto',
    'Podcast House',
    'Outro'
];

export const GuestIdentificationWizard: React.FC<GuestIdentificationWizardProps> = ({
    showId,
    onComplete,
    onCancel
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);
    const [searchResults, setSearchResults] = useState<GuestProfile[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [data, setData] = useState<WizardData>({
        guestName: '',
        guestReference: '',
        confirmedProfile: null,
        theme: '',
        themeMode: 'auto',
        season: '1',
        location: LOCATIONS[0],
        scheduledDate: '',
        scheduledTime: ''
    });

    // Step 1: Search for guest profile using Gemini Deep Research
    const handleSearchProfile = async () => {
        if (!data.guestName.trim()) return;

        setIsSearching(true);
        setSearchError(null);

        try {
            // Call Gemini Deep Research via podcastProductionService
            const result = await searchGuestProfile(
                data.guestName,
                data.guestReference || undefined
            );

            if (result.success && result.data) {
                // Transform research data to GuestProfile format
                const profile: GuestProfile = {
                    name: data.guestName,
                    fullName: result.data.full_name || data.guestName,
                    title: result.data.occupation || result.data.known_for || 'Convidado',
                    imageUrl: undefined, // Can be added later if we get profile images
                    summary: result.data.bio_summary || result.data.biography?.substring(0, 200) ||
                             `Informações sobre ${data.guestName}.`
                };

                setSearchResults([profile]);
                setStep(2);
            } else {
                // Search failed - use fallback or show error
                setSearchError(result.error || 'Não foi possível buscar informações sobre o convidado.');

                // Create a basic profile as fallback
                const fallbackProfile: GuestProfile = {
                    name: data.guestName,
                    fullName: data.guestName,
                    title: data.guestReference || 'Convidado',
                    imageUrl: undefined,
                    summary: `Perfil criado manualmente para ${data.guestName}. Pesquisa automática falhou - adicione informações manualmente na pré-produção.`
                };

                setSearchResults([fallbackProfile]);
                setStep(2);
            }
        } catch (error) {
            console.error('Error in handleSearchProfile:', error);
            setSearchError('Erro ao conectar com o serviço de pesquisa.');

            // Create fallback profile
            const fallbackProfile: GuestProfile = {
                name: data.guestName,
                fullName: data.guestName,
                title: data.guestReference || 'Convidado',
                imageUrl: undefined,
                summary: `Perfil criado manualmente. Adicione informações na pré-produção.`
            };

            setSearchResults([fallbackProfile]);
            setStep(2);
        } finally {
            setIsSearching(false);
        }
    };

    // Step 2: Confirm profile
    const handleConfirmProfile = (profile: GuestProfile) => {
        setData(prev => ({ ...prev, confirmedProfile: profile }));
        setStep(3);
    };

    // Step 3: Complete wizard - Create episode in Supabase
    const handleComplete = async () => {
        setIsCreatingEpisode(true);

        try {
            // Create episode with wizard data
            const { data: episode, error } = await supabase
                .from('podcast_episodes')
                .insert({
                    show_id: showId,
                    title: `${data.confirmedProfile?.fullName || data.guestName}`,
                    guest_name: data.confirmedProfile?.fullName || data.guestName,
                    episode_theme: data.theme || data.confirmedProfile?.title || 'Tema a definir',
                    status: 'draft',
                    scheduled_date: data.scheduledDate || null,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating episode:', error);
                alert(`Erro ao criar episódio: ${error.message}`);
                return;
            }

            // Call onComplete with wizard data AND episodeId
            onComplete(data, episode.id);
        } catch (error) {
            console.error('Error in handleComplete:', error);
            alert('Erro ao criar episódio. Tente novamente.');
        } finally {
            setIsCreatingEpisode(false);
        }
    };

    const canProceedStep1 = data.guestName.trim().length > 0;
    const canProceedStep3 = data.confirmedProfile && (data.theme || data.themeMode === 'auto');

    return (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-ceramic-base rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Progress Bar */}
                <div className="h-1 bg-[#E5E3DC]">
                    <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                        initial={{ width: '33%' }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: Name + Reference */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <User className="w-8 h-8 text-amber-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-ceramic-text-primary">
                                        Quem será entrevistado?
                                    </h2>
                                    <p className="text-ceramic-text-secondary text-sm mt-2">
                                        Informe o nome e uma referência para identificação
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                                            Nome do Convidado
                                        </label>
                                        <input
                                            type="text"
                                            value={data.guestName}
                                            onChange={(e) => setData(prev => ({ ...prev, guestName: e.target.value }))}
                                            placeholder="Ex: Eduardo Paes"
                                            className="w-full px-4 py-4 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-amber-400/50 outline-none transition-all shadow-inner"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                                            Referência (cargo, título, área)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.guestReference}
                                            onChange={(e) => setData(prev => ({ ...prev, guestReference: e.target.value }))}
                                            placeholder="Ex: Prefeito do Rio de Janeiro"
                                            className="w-full px-4 py-4 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-amber-400/50 outline-none transition-all shadow-inner"
                                        />
                                        <p className="text-xs text-ceramic-text-tertiary mt-2 ml-1">
                                            Ajuda a IA a identificar corretamente a pessoa
                                        </p>
                                    </div>

                                    {/* Error message */}
                                    {searchError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 rounded-xl bg-white border border-ceramic-accent/20 flex items-start gap-3"
                                        >
                                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-ceramic-text-primary">
                                                    Busca automática falhou
                                                </p>
                                                <p className="text-xs text-ceramic-text-secondary mt-1">
                                                    {searchError}
                                                </p>
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Um perfil básico foi criado. Você pode adicionar informações manualmente na pré-produção.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 py-4 px-6 rounded-xl text-ceramic-text-secondary font-bold hover:bg-white/50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSearchProfile}
                                        disabled={!canProceedStep1 || isSearching}
                                        className="flex-1 py-4 px-6 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSearching ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Buscando...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-5 h-5" />
                                                Buscar Perfil
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Confirm Profile */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-ceramic-text-primary">
                                        Confirme o convidado
                                    </h2>
                                    <p className="text-ceramic-text-secondary text-sm mt-2">
                                        Este é o perfil correto?
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {searchResults.map((profile, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleConfirmProfile(profile)}
                                            className="w-full p-4 rounded-2xl bg-white border-2 border-transparent hover:border-amber-400 transition-all text-left group shadow-sm hover:shadow-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center flex-shrink-0">
                                                    {profile.imageUrl ? (
                                                        <img src={profile.imageUrl} alt={profile.name} className="w-full h-full rounded-xl object-cover" />
                                                    ) : (
                                                        <User className="w-8 h-8 text-amber-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-ceramic-text-primary text-lg truncate">
                                                        {profile.fullName || profile.name}
                                                    </h3>
                                                    <p className="text-ceramic-text-secondary text-sm truncate">
                                                        {profile.title}
                                                    </p>
                                                    {profile.summary && (
                                                        <p className="text-ceramic-text-tertiary text-xs mt-1 line-clamp-2">
                                                            {profile.summary}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Check className="w-5 h-5 text-amber-600" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full py-3 text-ceramic-text-secondary font-medium hover:text-ceramic-text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Não é esse, buscar novamente
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 3: Theme + Scheduling */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <Check className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-ceramic-text-primary">
                                        {data.confirmedProfile?.fullName || data.confirmedProfile?.name}
                                    </h2>
                                    <p className="text-ceramic-text-secondary text-sm">
                                        {data.confirmedProfile?.title}
                                    </p>
                                </div>

                                {/* Theme Selection */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                                        Tema da Conversa
                                    </label>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setData(prev => ({ ...prev, themeMode: 'auto', theme: '' }))}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${data.themeMode === 'auto'
                                                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                                                    : 'bg-[#EBE9E4] text-ceramic-text-secondary hover:bg-white'
                                                }`}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Aica Auto
                                        </button>
                                        <button
                                            onClick={() => setData(prev => ({ ...prev, themeMode: 'manual' }))}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${data.themeMode === 'manual'
                                                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                                                    : 'bg-[#EBE9E4] text-ceramic-text-secondary hover:bg-white'
                                                }`}
                                        >
                                            Manual
                                        </button>
                                    </div>

                                    {data.themeMode === 'manual' && (
                                        <motion.input
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            type="text"
                                            value={data.theme}
                                            onChange={(e) => setData(prev => ({ ...prev, theme: e.target.value }))}
                                            placeholder="Ex: Políticas Públicas, Empreendedorismo..."
                                            className="w-full px-4 py-3 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-amber-400/50 outline-none transition-all shadow-inner"
                                        />
                                    )}
                                </div>

                                {/* Scheduling Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                                            <Hash className="w-3 h-3 inline mr-1" />
                                            Temporada
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.season}
                                            onChange={(e) => setData(prev => ({ ...prev, season: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            Local
                                        </label>
                                        <select
                                            value={data.location}
                                            onChange={(e) => setData(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
                                        >
                                            {LOCATIONS.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            Data
                                        </label>
                                        <input
                                            type="date"
                                            value={data.scheduledDate}
                                            onChange={(e) => setData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Hora
                                        </label>
                                        <input
                                            type="time"
                                            value={data.scheduledTime}
                                            onChange={(e) => setData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-[#EBE9E4] text-ceramic-text-primary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={isCreatingEpisode}
                                        className="py-4 px-6 rounded-xl text-ceramic-text-secondary font-bold hover:bg-white/50 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleComplete}
                                        disabled={!canProceedStep3 || isCreatingEpisode}
                                        className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isCreatingEpisode ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Criando Episódio...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Iniciar Pesquisa
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default GuestIdentificationWizard;
