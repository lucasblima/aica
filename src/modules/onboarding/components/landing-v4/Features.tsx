import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  MessageCircle,
  Sparkles,
  Mic,
  DollarSign,
  FileText,
  Calendar,
  Trophy
} from 'lucide-react';

/**
 * Features - Cards com ícones dos módulos
 *
 * Design Philosophy: Clean, informative feature grid
 * Showcases all major modules with clear value propositions
 */

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: CheckCircle2,
    title: 'Meu Dia (Atlas)',
    description: 'Gerencie tarefas com matriz de Eisenhower. Priorize o que importa e organize seu dia com eficiência.',
    color: 'text-blue-600'
  },
  {
    icon: Sparkles,
    title: 'Minha Jornada',
    description: 'Registre momentos significativos e acumule pontos de consciência. Sua evolução mapeada.',
    color: 'text-purple-600'
  },
  {
    icon: Mic,
    title: 'Podcast Studio',
    description: 'Produza podcasts com IA. Pesquise convidados, crie pautas e gerencie episódios profissionalmente.',
    color: 'text-orange-600'
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Analytics',
    description: 'Insights profundos sobre suas conversas. Análise LGPD-compliant via Evolution API.',
    color: 'text-green-600'
  },
  {
    icon: DollarSign,
    title: 'Finance Tracker',
    description: 'Processe extratos bancários automaticamente. Controle financeiro inteligente com IA.',
    color: 'text-emerald-600'
  },
  {
    icon: FileText,
    title: 'Grants Parser',
    description: 'Analise editais em PDF com IA. Extraia informações cruciais para oportunidades de financiamento.',
    color: 'text-indigo-600'
  },
  {
    icon: Calendar,
    title: 'Google Calendar Sync',
    description: 'Integração perfeita com sua agenda. Sincronize eventos e visualize tudo em um só lugar.',
    color: 'text-red-600'
  },
  {
    icon: Trophy,
    title: 'Gamificação',
    description: 'XP, níveis, conquistas e streaks. Transforme progresso em motivação tangível.',
    color: 'text-yellow-600'
  }
];

export function Features() {
  return (
    <section className="bg-gradient-to-b from-ceramic-base to-ceramic-accent/5 py-20 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-bold text-ceramic-accent uppercase tracking-wider mb-3">
            Funcionalidades
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-ceramic-text-primary tracking-tight mb-6">
            Tudo que você precisa
          </h2>
          <p className="text-xl text-ceramic-text-secondary max-w-3xl mx-auto font-light">
            Módulos integrados para gerenciar cada aspecto da sua vida pessoal e profissional
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="
                ceramic-card
                p-6
                rounded-2xl
                transition-all duration-300
                hover:shadow-[12px_12px_24px_rgba(163,158,145,0.20),-12px_-12px_24px_rgba(255,255,255,0.95)]
                group
              "
            >
              {/* Icon */}
              <div className={`
                w-14 h-14
                ceramic-inset
                rounded-xl
                flex items-center justify-center
                mb-4
                group-hover:scale-110
                transition-transform duration-300
              `}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-black text-ceramic-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-ceramic-text-secondary font-light leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-ceramic-text-secondary text-base">
            E muito mais por vir...
          </p>
        </motion.div>
      </div>
    </section>
  );
}
