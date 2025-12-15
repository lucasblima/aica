import React from 'react';
import { Heart, Brain, Target, Sparkles } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Heart,
    title: 'Registro de Momentos',
    description: 'Registre seus momentos, sentimentos e reflexões. Use texto, áudio ou ambos.'
  },
  {
    number: 2,
    icon: Brain,
    title: 'Análise Inteligente',
    description: 'Aica analisa seus padrões e contexto para entender o que é importante para você.'
  },
  {
    number: 3,
    icon: Target,
    title: 'Recomendações Personalizadas',
    description: 'Receba módulos e insights personalizados para o que você realmente quer trabalhar.'
  },
  {
    number: 4,
    icon: Sparkles,
    title: 'Transformação',
    description: 'Acompanhe seu crescimento com dashboards, reflexões e conquistas semanais.'
  }
];

export function HowItWorks() {
  return (
    <section className="bg-ceramic-base py-16 md:py-28 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-black text-ceramic-text-primary text-etched mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-ceramic-text-secondary">
            Um fluxo simples e intuitivo para seu crescimento pessoal
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Desktop Arrow Line */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-ceramic-highlight" />

          {/* Steps Grid */}
          <div className="grid md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {/* Number Badge */}
                  <div className="mb-4">
                    <div className="w-12 h-12 ceramic-card bg-ceramic-base rounded-full flex items-center justify-center text-ceramic-accent font-black text-lg shadow-md border-2 border-ceramic-accent hover:shadow-lg transition-shadow">
                      {step.number}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="mb-4">
                    <Icon
                      size={48}
                      className="text-ceramic-accent hover:scale-110 transition-transform"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                    {step.description}
                  </p>

                  {/* Mobile Arrow */}
                  {idx < steps.length - 1 && (
                    <div className="md:hidden w-full flex justify-center mt-6">
                      <div className="text-ceramic-accent text-2xl">↓</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-ceramic-text-secondary mb-6">
            Tudo pensado para ser simples e natural
          </p>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 text-ceramic-accent font-600 hover:text-ceramic-text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2 rounded px-2 py-1 transition-colors"
          >
            Veja como começar
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
