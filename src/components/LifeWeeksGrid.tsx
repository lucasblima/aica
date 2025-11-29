import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Brain, ChevronDown, ChevronUp, X, Sparkles, CheckCircle2, AlertCircle, Wallet, Heart, Users, Building2, Scale } from 'lucide-react';
import { updateUserProfile, getLifeEvents, createLifeEvent, getUserProfile } from '../services/supabaseService';

interface LifeWeeksGridProps {
    userId: string;
}

interface LifeEvent {
    id: string;
    week_number: number;
    title: string;
    type: string;
    module?: string;
}

const MODULES = [
    { id: 'finance', label: 'Finanças', icon: Wallet, color: 'bg-emerald-500' },
    { id: 'health', label: 'Saúde', icon: Heart, color: 'bg-rose-500' },
    { id: 'community', label: 'Associações', icon: Users, color: 'bg-blue-500' },
    { id: 'education', label: 'Educação', icon: Building2, color: 'bg-amber-500' },
    { id: 'legal', label: 'Jurídico', icon: Scale, color: 'bg-slate-500' },
];

export const LifeWeeksGrid: React.FC<LifeWeeksGridProps> = ({ userId }) => {
    const [birthDate, setBirthDate] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);

    // Planning Modal State
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [generatedTasks, setGeneratedTasks] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            console.log('[LifeWeeks] Loading data for user:', userId);

            // Fetch profile first
            const profile = await getUserProfile(userId).catch(err => {
                console.error('[LifeWeeks] Error fetching profile:', err);
                return null;
            });

            // Try to fetch events, but don't block if it fails
            const events = await getLifeEvents().catch(err => {
                console.warn('[LifeWeeks] Could not load life events (table might be missing):', err);
                return [];
            });

            console.log('[LifeWeeks] Profile loaded:', profile);
            console.log('[LifeWeeks] Events loaded:', events);

            if (profile?.birth_date) {
                setBirthDate(profile.birth_date);
            }
            setLifeEvents(events || []);
        } catch (error) {
            console.error('[LifeWeeks] Critical error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBirthDate = async (date: string) => {
        try {
            console.log('[LifeWeeks] Saving birth date:', date);
            await updateUserProfile(userId, { birth_date: date });
            setBirthDate(date);
            console.log('[LifeWeeks] Birth date saved successfully');
        } catch (error: any) {
            console.error('[LifeWeeks] Error saving birth date:', error);
            alert(`Erro ao salvar data de nascimento:\n${error.message || JSON.stringify(error)}`);
        }
    };

    const suggestModule = (title: string) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('pagar') || lowerTitle.includes('compra') || lowerTitle.includes('investir') || lowerTitle.includes('dinheiro')) return 'finance';
        if (lowerTitle.includes('médico') || lowerTitle.includes('exame') || lowerTitle.includes('treino') || lowerTitle.includes('dieta')) return 'health';
        if (lowerTitle.includes('reunião') || lowerTitle.includes('evento') || lowerTitle.includes('festa') || lowerTitle.includes('encontro')) return 'community';
        if (lowerTitle.includes('curso') || lowerTitle.includes('aula') || lowerTitle.includes('ler') || lowerTitle.includes('estudar')) return 'education';
        if (lowerTitle.includes('contrato') || lowerTitle.includes('processo') || lowerTitle.includes('advogado') || lowerTitle.includes('lei')) return 'legal';
        return null;
    };

    const handlePlanEvent = async () => {
        if (!selectedWeek || !eventTitle) return;
        setAiProcessing(true);

        console.log('[LifeWeeks] Planning event for week:', selectedWeek);

        // Simulate AI planning with smarter heuristics
        setTimeout(() => {
            const suggestedModule = suggestModule(eventTitle);
            const finalModule = selectedModule || suggestedModule || 'general';

            if (suggestedModule && !selectedModule) {
                setSelectedModule(suggestedModule);
            }

            let tasks: string[] = [];

            // 1. Module-based templates with Actionable Items
            switch (finalModule) {
                case 'finance':
                    tasks = [
                        '📲 Enviar mensagem para Contador sobre declaração',
                        '💰 Definir teto de gastos para o projeto',
                        '📊 Criar planilha de custos no Excel/Notion',
                        '🔍 Pesquisar melhores taxas de investimento'
                    ];
                    break;
                case 'health':
                    tasks = [
                        '📞 Ligar para clínica e agendar check-up',
                        '💊 Comprar vitaminas na farmácia',
                        '🍎 Criar lista de compras saudável',
                        '📅 Bloquear horário na agenda para exercícios'
                    ];
                    break;
                case 'education':
                    tasks = [
                        '📧 Enviar e-mail para coordenação sobre matrícula',
                        '📚 Comprar livros da bibliografia obrigatória',
                        '📝 Criar cronograma de estudos no Calendar',
                        '🔍 Pesquisar cursos complementares na Udemy/Coursera'
                    ];
                    break;
                case 'legal':
                    tasks = [
                        '📲 Enviar mensagem para Advogado solicitando minuta',
                        '🖨️ Imprimir e assinar contrato',
                        '🏢 Ir ao cartório reconhecer firma',
                        '📂 Digitalizar e salvar documentos no Drive'
                    ];
                    break;
                case 'community':
                    tasks = [
                        '📲 Enviar convite via WhatsApp para grupo',
                        '📅 Criar evento no Google Calendar',
                        '🛒 Fazer lista de compras para o evento',
                        '📍 Reservar salão/espaço'
                    ];
                    break;
                default:
                    tasks = [
                        '📝 Definir primeira ação prática',
                        '📲 Enviar mensagem para envolvidos',
                        '📅 Definir data limite',
                        '🔍 Pesquisar referências no Google'
                    ];
            }

            // 2. Keyword-based overrides (Context awareness)
            const lowerTitle = eventTitle.toLowerCase();
            const lowerDesc = eventDescription.toLowerCase();

            if (lowerTitle.includes('viagem') || lowerTitle.includes('férias')) {
                tasks = [
                    '🔍 Pesquisar voos no Skyscanner',
                    '🏨 Reservar hotel no Booking',
                    '🗺️ Criar roteiro dia-a-dia no Maps',
                    '💼 Verificar validade do passaporte'
                ];
            } else if (lowerTitle.includes('reunião') || lowerTitle.includes('call')) {
                tasks = [
                    '📅 Enviar invite da reunião',
                    '📝 Preparar pauta da reunião',
                    '📲 Confirmar presença com participantes',
                    '💻 Testar link do Zoom/Meet'
                ];
            } else if (lowerDesc.includes('comprar') || lowerTitle.includes('comprar')) {
                tasks = [
                    '🔍 Pesquisar preços em 3 lojas',
                    '💰 Verificar limite do cartão',
                    '🛒 Finalizar compra',
                    '📦 Rastrear entrega'
                ];
            }

            setGeneratedTasks(tasks);
            setAiProcessing(false);
            console.log('[LifeWeeks] AI planning completed');
        }, 1500);
    };

    const handleCreateMilestone = async () => {
        if (!selectedWeek || !eventTitle) {
            alert('Por favor, preencha o título do evento.');
            return;
        }

        if (!birthDate) {
            alert('Data de nascimento não encontrada.');
            return;
        }

        try {
            setIsSaving(true);

            // Calculate event_date based on birthDate + weeks
            const parts = birthDate.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const birth = new Date(year, month, day);

            // Add weeks to birth date
            const eventDateObj = new Date(birth.getTime() + (selectedWeek * 7 * 24 * 60 * 60 * 1000));
            const eventDateISO = eventDateObj.toISOString().split('T')[0]; // YYYY-MM-DD

            console.log('[LifeWeeks] Creating milestone:', {
                title: eventTitle,
                description: eventDescription,
                week_number: selectedWeek,
                event_date: eventDateISO,
                type: 'milestone',
                status: 'planned',
                module: selectedModule
            });

            const newEvent = await createLifeEvent({
                title: eventTitle,
                description: eventDescription,
                week_number: selectedWeek,
                event_date: eventDateISO,
                type: 'milestone',
                status: 'planned',
                module: selectedModule || undefined
            });

            console.log('[LifeWeeks] Milestone created successfully:', newEvent);

            // Update local state
            setLifeEvents([...lifeEvents, {
                id: newEvent.id || 'temp-' + Date.now(),
                week_number: selectedWeek,
                title: eventTitle,
                type: 'milestone',
                module: selectedModule || undefined
            }]);

            // Reset modal
            setIsPlanning(false);
            setSelectedWeek(null);
            setEventTitle('');
            setEventDescription('');
            setGeneratedTasks([]);
            setSelectedModule(null);

            alert('✅ Marco criado com sucesso!');
        } catch (error: any) {
            console.error('[LifeWeeks] Error creating milestone:', error);
            console.error('[LifeWeeks] Error details:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
            });

            alert(`❌ Erro ao criar marco:\n\n${error?.message || 'Erro desconhecido'}\n\nVerifique o console para mais detalhes.`);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculations
    const LIFE_EXPECTANCY_YEARS = 73.1;
    const totalWeeks = Math.ceil(LIFE_EXPECTANCY_YEARS * 52.1429);

    const weeksData = useMemo(() => {
        if (!birthDate) return null;

        const parts = birthDate.split('-');
        if (parts.length !== 3) return { currentWeek: 0 };

        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        const birth = new Date(year, month, day);
        const today = new Date();

        const diffTime = today.getTime() - birth.getTime();
        const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

        return { currentWeek: Math.max(0, currentWeek) };
    }, [birthDate]);

    const formatter = new Intl.NumberFormat('pt-BR');

    if (isLoading) {
        return (
            <div className="ceramic-card p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 ceramic-inset rounded-xl"></div>
                        <div>
                            <div className="h-3 w-24 bg-ceramic-text-secondary/20 rounded mb-2"></div>
                            <div className="h-6 w-48 bg-ceramic-text-secondary/20 rounded"></div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="h-8 w-16 bg-ceramic-text-secondary/20 rounded mb-1"></div>
                        <div className="h-3 w-12 bg-ceramic-text-secondary/20 rounded"></div>
                    </div>
                </div>

                {/* Animated Progress Bar Skeleton */}
                <div className="relative h-4 ceramic-inset rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ceramic-highlight/50 to-transparent animate-shimmer"></div>
                </div>

                <p className="text-xs text-ceramic-text-secondary mt-3 text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculando sua jornada de vida...
                </p>
            </div>
        );
    }

    // STATE 1: No Birth Date
    if (!birthDate) {
        return (
            <div className="ceramic-card p-8 text-ceramic-text-primary relative overflow-hidden">
                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-2 mb-4 text-ceramic-text-secondary">
                        <Calendar className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider text-etched">Memento Mori</span>
                    </div>

                    <h2 className="text-3xl font-black mb-4 text-etched">Quantas semanas você ainda tem?</h2>
                    <p className="text-ceramic-text-secondary mb-8 text-lg">
                        Descubra seu horizonte de tempo e comece a viver com intencionalidade.
                    </p>

                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-ceramic-text-secondary mb-2 uppercase">Sua Data de Nascimento</label>
                            <input
                                type="date"
                                className="w-full ceramic-inset px-4 py-3 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-all"
                                onBlur={(e) => {
                                    const dateValue = e.target.value;
                                    if (dateValue && dateValue.length === 10) {
                                        handleSaveBirthDate(dateValue);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // STATE 2: The Accordion
    const { currentWeek } = weeksData!;
    const remainingWeeks = Math.max(0, totalWeeks - currentWeek);
    const percentLived = Math.round((currentWeek / totalWeeks) * 100);

    return (
        <>
            <div className="ceramic-card overflow-hidden transition-all duration-500">
                {/* Collapsed State - Progress Bar */}
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="cursor-pointer p-6 hover:bg-white/30 transition-colors"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 ceramic-inset flex items-center justify-center">
                                <Brain className="w-5 h-5 text-ceramic-text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider text-etched">Minha Jornada</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setBirthDate(null);
                                        }}
                                        className="text-[9px] ceramic-inset px-2 py-0.5 rounded-full hover:bg-white/50 text-ceramic-text-secondary transition-colors"
                                    >
                                        Editar
                                    </button>
                                </div>
                                <h3 className="text-xl font-black text-ceramic-text-primary text-etched">
                                    Semana {formatter.format(currentWeek)} de {formatter.format(totalWeeks)}
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-3xl font-black text-ceramic-text-primary text-etched">{percentLived}%</p>
                                <p className="text-xs text-ceramic-text-secondary">Vivido</p>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="w-6 h-6 text-ceramic-text-secondary" />
                            ) : (
                                <ChevronDown className="w-6 h-6 text-ceramic-text-secondary" />
                            )}
                        </div>
                    </div>

                    {/* Thick Progress Bar */}
                    <div className="relative h-4 ceramic-inset rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-ceramic-text-primary rounded-full transition-all duration-1000"
                            style={{ width: `${percentLived}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                        </div>
                        {/* Current Week Marker */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-ceramic-accent shadow-lg"
                            style={{ left: `${percentLived}%` }}
                        >
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-ceramic-accent rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    {!isExpanded && (
                        <p className="text-xs text-ceramic-text-secondary mt-3 text-center">
                            Restam aproximadamente <span className="font-bold text-ceramic-text-primary">{formatter.format(remainingWeeks)}</span> semanas · Clique para ver a grade completa
                        </p>
                    )}
                </div>

                {/* Expanded State - The Grid */}
                {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-ceramic-text-secondary/10">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-ceramic-text-secondary">
                                Cada quadrado = 1 semana · 2 linhas = 1 ano (52 semanas)
                            </p>
                            <div className="flex gap-3 text-xs font-medium text-ceramic-text-secondary">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-ceramic-text-primary rounded-full"></div>
                                    <span>Vivido</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-ceramic-accent rounded-full animate-pulse"></div>
                                    <span>Agora</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 ceramic-inset rounded-full"></div>
                                    <span>Futuro</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid with rows of 26 weeks (half year) */}
                        <div className="overflow-x-auto pb-4">
                            <div className="space-y-1 min-w-max max-h-96 overflow-y-auto p-4 ceramic-inset rounded-2xl">
                                {(() => {
                                    const rows = [];
                                    for (let i = 0; i < totalWeeks; i += 26) {
                                        const rowWeeks = [];
                                        for (let j = 0; j < 26 && (i + j) < totalWeeks; j++) {
                                            const weekNum = i + j + 1;
                                            const isPast = weekNum < currentWeek;
                                            const isCurrent = weekNum === currentWeek;
                                            const event = lifeEvents.find(e => e.week_number === weekNum);

                                            rowWeeks.push({ weekNum, isPast, isCurrent, event });
                                        }
                                        rows.push(rowWeeks);
                                    }

                                    return rows.map((row, rowIndex) => {
                                        const isYearEnd = rowIndex % 2 === 1;

                                        return (
                                            <div
                                                key={rowIndex}
                                                className={`flex gap-1 ${isYearEnd ? 'mb-3' : ''}`}
                                            >
                                                {row.map(({ weekNum, isPast, isCurrent, event }) => {
                                                    let className = "w-3 h-3 rounded-full transition-all duration-200 ";

                                                    if (event) {
                                                        const module = MODULES.find(m => m.id === event.module);
                                                        className += module ? `${module.color} hover:opacity-80 cursor-pointer shadow-sm` : "bg-amber-500 hover:bg-amber-600 cursor-pointer shadow-sm";
                                                    } else if (isCurrent) {
                                                        className += "bg-ceramic-accent animate-pulse shadow-sm";
                                                    } else if (isPast) {
                                                        className += "bg-ceramic-text-primary/80 hover:bg-ceramic-text-primary";
                                                    } else {
                                                        className += "bg-ceramic-base shadow-inner hover:bg-white/50 cursor-pointer";
                                                    }

                                                    return (
                                                        <div
                                                            key={weekNum}
                                                            className={className}
                                                            title={event ? `${event.title} (${event.module || 'Geral'})` : `Semana ${weekNum}`}
                                                            onClick={() => {
                                                                if (!isPast && !event) {
                                                                    setSelectedWeek(weekNum);
                                                                    setIsPlanning(true);
                                                                } else if (event) {
                                                                    alert(`Marco: ${event.title}\nÁrea: ${event.module || 'Geral'}`);
                                                                }
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {row.length < 26 && (
                                                    <>
                                                        {[...Array(26 - row.length)].map((_, i) => (
                                                            <div key={`empty-${i}`} className="w-3 h-3"></div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Planning Modal */}
            {isPlanning && selectedWeek && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="ceramic-card w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-6 border-b border-ceramic-text-secondary/10 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider text-etched">PLANEJANDO O FUTURO</p>
                                <h3 className="text-xl font-black text-ceramic-text-primary text-etched">Semana {selectedWeek}</h3>
                                <p className="text-sm text-ceramic-text-secondary">Daqui a {Math.floor((selectedWeek - currentWeek) / 52)} anos</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsPlanning(false);
                                    setEventTitle('');
                                    setEventDescription('');
                                    setGeneratedTasks([]);
                                    setSelectedModule(null);
                                }}
                                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-ceramic-text-secondary" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-ceramic-text-primary mb-1">O que vai acontecer?</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Viagem para Europa, Casamento, Aposentadoria..."
                                    className="w-full ceramic-inset px-4 py-3 font-medium text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-colors"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-ceramic-text-primary mb-1">Área da Vida</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {MODULES.map((module) => {
                                        const Icon = module.icon;
                                        const isSelected = selectedModule === module.id;
                                        return (
                                            <button
                                                key={module.id}
                                                onClick={() => setSelectedModule(module.id)}
                                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${isSelected
                                                    ? 'bg-ceramic-highlight border-ceramic-accent text-ceramic-text-primary'
                                                    : 'bg-transparent border-transparent text-ceramic-text-secondary hover:bg-white/30'
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 ${isSelected ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'}`} />
                                                <span className="text-[10px] font-bold uppercase">{module.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-ceramic-text-primary mb-1">Detalhes (Opcional)</label>
                                <textarea
                                    placeholder="Descreva seu objetivo..."
                                    className="w-full ceramic-inset px-4 py-3 font-medium text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-colors h-24 resize-none"
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                />
                            </div>

                            {generatedTasks.length > 0 ? (
                                <div className="bg-ceramic-highlight/30 rounded-xl p-4 border border-ceramic-highlight">
                                    <div className="flex items-center gap-2 mb-3 text-ceramic-text-primary">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Plano Sugerido pela IA</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {generatedTasks.map((task, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-ceramic-text-primary">
                                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-ceramic-accent shrink-0" />
                                                <span>{task}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <button
                                    onClick={handlePlanEvent}
                                    disabled={!eventTitle || aiProcessing}
                                    className="w-full py-3 ceramic-card text-ceramic-text-primary rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {aiProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-ceramic-text-primary/30 border-t-ceramic-text-primary rounded-full animate-spin"></div>
                                            <span>Consultando Agente n8n...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Planejar com IA</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="p-6 bg-ceramic-base/50 border-t border-ceramic-text-secondary/10 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsPlanning(false);
                                    setEventTitle('');
                                    setEventDescription('');
                                    setGeneratedTasks([]);
                                    setSelectedModule(null);
                                }}
                                className="px-6 py-3 text-ceramic-text-secondary font-bold hover:bg-white/50 rounded-xl transition-colors"
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateMilestone}
                                disabled={!eventTitle || isSaving}
                                className="px-6 py-3 bg-ceramic-text-primary text-white font-bold rounded-xl hover:bg-ceramic-text-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Confirmar Marco</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
