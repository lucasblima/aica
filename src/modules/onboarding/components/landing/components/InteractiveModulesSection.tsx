import { motion } from 'framer-motion';
import { useState } from 'react';
import { LayoutGrid, BookOpen, Mic, FileText, DollarSign, Users, Activity, Calendar } from 'lucide-react';

const MODULES = [
    {
        id: 'atlas',
        name: 'Atlas',
        icon: LayoutGrid,
        desc: 'Metas e Projetos',
        value: 'A matriz que corta o ruído.',
        color: 'text-blue-600',
    },
    {
        id: 'journey',
        name: 'Journey',
        icon: BookOpen,
        desc: 'Diário e Reflexão',
        value: 'Autoconhecimento registrado.',
        color: 'text-purple-600',
    },
    {
        id: 'studio',
        name: 'Studio',
        icon: Mic,
        desc: 'Criação de Conteúdo',
        value: 'Sua voz, organizada pela IA.',
        color: 'text-pink-600',
    },
    {
        id: 'grants',
        name: 'Grants',
        icon: FileText,
        desc: 'Editais e Fomento',
        value: 'Recursos na palma da mão.',
        color: 'text-indigo-600',
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: DollarSign,
        desc: 'Gestão Financeira',
        value: 'Extratos lidos automaticamente.',
        color: 'text-green-600',
    },
    {
        id: 'connections',
        name: 'Connections',
        icon: Users,
        desc: 'CRM Pessoal',
        value: 'O CRM do seu WhatsApp.',
        color: 'text-orange-600',
    },
    {
        id: 'flux',
        name: 'Flux',
        icon: Activity,
        desc: 'Saúde e Treinos',
        value: 'Treinos prescritos. Rastreio exato.',
        color: 'text-red-600',
    },
    {
        id: 'agenda',
        name: 'Agenda',
        icon: Calendar,
        desc: 'Duração Diária',
        value: 'Seu Google Calendar, agora inteligente.',
        color: 'text-teal-600',
    },
];

export function InteractiveModulesSection() {
    const [activeModule, setActiveModule] = useState<string | null>(null);

    return (
        <section className="py-24 bg-ceramic-base overflow-hidden relative">
            {/* Etched Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" className="text-ceramic-text-secondary" />
                </svg>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary tracking-tighter mb-4">
                        A Prateleira do Ateliê
                    </h2>
                    <p className="text-ceramic-text-secondary font-medium uppercase tracking-widest text-sm">
                        8 blocos táteis para moldar sua rotina
                    </p>
                </div>

                {/* Horizontal Scroll Area */}
                <div className="flex overflow-x-auto pb-12 snap-x snap-mandatory hide-scrollbar gap-6 items-center px-4 md:px-0">
                    {MODULES.map((mod, index) => {
                        const Icon = mod.icon;
                        const isActive = activeModule === mod.id;

                        return (
                            <motion.div
                                key={mod.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
                                onHoverStart={() => setActiveModule(mod.id)}
                                onHoverEnd={() => setActiveModule(null)}
                                onClick={() => setActiveModule(isActive ? null : mod.id)}
                                className={`snap-center shrink-0 w-72 h-80 rounded-3xl p-8 relative transition-all duration-300 cursor-pointer ${isActive
                                        ? 'bg-ceramic-base shadow-inner scale-[0.98]'
                                        : 'bg-ceramic-base ceramic-card hover:scale-[1.02]'
                                    }`}
                            >
                                {/* Embedded Design */}
                                <div className="absolute top-6 right-6 opacity-10">
                                    <Icon size={120} />
                                </div>

                                <div className="flex flex-col h-full justify-between relative z-10">
                                    <div>
                                        <div className={`p-4 rounded-2xl w-16 h-16 flex items-center justify-center bg-white/50 backdrop-blur-sm mb-6 ${isActive ? 'shadow-inner' : 'ceramic-shadow'}`}>
                                            <Icon size={28} className={mod.color} />
                                        </div>
                                        <h3 className="text-2xl font-black text-ceramic-text-primary tracking-tight mb-2">
                                            {mod.name}
                                        </h3>
                                        <p className="text-ceramic-text-secondary font-medium">
                                            {mod.desc}
                                        </p>
                                    </div>

                                    <motion.div
                                        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-amber-600 font-bold text-lg leading-tight"
                                    >
                                        "{mod.value}"
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
        </section>
    );
}
