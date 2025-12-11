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
    <section className="bg-gradient-to-b from-[#F8F7F5] to-white py-16 md:py-28 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2B1B17] mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-[#5C554B]">
            Um fluxo simples e intuitivo para seu crescimento pessoal
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Desktop Arrow Line */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-[#E8E6E0] via-[#6B9EFF] to-[#E8E6E0]" />

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
                    <div className="w-12 h-12 bg-gradient-to-br from-[#6B9EFF] to-[#845EF7] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:shadow-lg transition-shadow">
                      {step.number}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="mb-4">
                    <Icon
                      size={48}
                      color="#6B9EFF"
                      strokeWidth={1.5}
                      className="hover:scale-110 transition-transform"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-[#2B1B17] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#5C554B] leading-relaxed">
                    {step.description}
                  </p>

                  {/* Mobile Arrow */}
                  {idx < steps.length - 1 && (
                    <div className="md:hidden w-full flex justify-center mt-6">
                      <div className="text-[#6B9EFF] text-2xl">↓</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-[#5C554B] mb-6">
            Tudo pensado para ser simples e natural
          </p>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 text-[#6B9EFF] font-600 hover:underline focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2 rounded px-2 py-1"
          >
            Veja como começar
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
