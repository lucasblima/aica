import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Sparkles, TrendingUp } from 'lucide-react';

/**
 * HowItWorks - 3 passos simples ilustrados
 *
 * Design Philosophy: Clear, linear progression
 * Shows the user journey from signup to mastery
 */

interface Step {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const steps: Step[] = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crie sua conta',
    description: 'Cadastre-se gratuitamente em segundos. Sem cartão de crédito, sem compromisso. Comece sua jornada imediatamente.',
    color: 'from-blue-400 to-blue-600'
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Registre suas experiências',
    description: 'Capture pensamentos, organize tarefas e responda perguntas diárias. O sistema se adapta ao seu ritmo.',
    color: 'from-purple-400 to-purple-600'
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Evolua continuamente',
    description: 'Acompanhe seu progresso com métricas e gamificação. Transforme autoconhecimento em crescimento real.',
    color: 'from-green-400 to-green-600'
  }
];

export function HowItWorks() {
  return (
    <section className="bg-ceramic-base py-20 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-sm font-bold text-ceramic-accent uppercase tracking-wider mb-3">
            Como Funciona
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-ceramic-text-primary tracking-tight mb-6">
            Simples. Poderoso. Eficaz.
          </h2>
          <p className="text-xl text-ceramic-text-secondary max-w-2xl mx-auto font-light">
            Três passos para transformar sua relação com autoconhecimento
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-16 md:space-y-24">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`
                flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}
                items-center gap-8 md:gap-16
              `}
            >
              {/* Visual Side */}
              <div className="flex-1 w-full">
                <div className="
                  ceramic-card
                  rounded-3xl
                  p-12
                  flex items-center justify-center
                  aspect-square
                  max-w-md
                  mx-auto
                  group
                  hover:shadow-[16px_16px_32px_rgba(163,158,145,0.25),-16px_-16px_32px_rgba(255,255,255,1)]
                  transition-all duration-500
                ">
                  {/* Icon with gradient background */}
                  <div className={`
                    relative
                    w-40 h-40
                    rounded-full
                    bg-gradient-to-br ${step.color}
                    flex items-center justify-center
                    group-hover:scale-110
                    transition-transform duration-500
                  `}>
                    <step.icon className="w-20 h-20 text-white" />

                    {/* Step number badge */}
                    <div className="
                      absolute -top-4 -right-4
                      w-16 h-16
                      ceramic-card
                      rounded-full
                      flex items-center justify-center
                      shadow-lg
                    ">
                      <span className="text-2xl font-black text-ceramic-text-primary">
                        {step.number}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Side */}
              <div className="flex-1 w-full text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black text-ceramic-text-primary mb-4 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-lg md:text-xl text-ceramic-text-secondary font-light leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Connection Lines (Desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="w-full bg-gradient-to-b from-transparent via-ceramic-accent/20 to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
