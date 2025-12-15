import React from 'react';
import { Brain, Zap, Lock } from 'lucide-react';

const benefits = [
  {
    icon: Brain,
    title: 'Autoconhecimento Profundo',
    description: 'Entenda seus padrões emocionais, comportamentos e valores através de registro estruturado de momentos. Veja como você realmente é, não como imagina ser.'
  },
  {
    icon: Zap,
    title: 'Crescimento Personalizado',
    description: 'Recomendações customizadas baseadas em seu contexto de vida. Se você está focado em saúde, finanças ou relacionamentos, Aica aprende e se adapta.'
  },
  {
    icon: Lock,
    title: 'Privacidade & Segurança',
    description: 'Seus dados são seus. Criptografia end-to-end, sem venda de dados, sem rastreamento. Você controla completamente o que é compartilhado.'
  }
];

export function ValueProposition() {
  return (
    <section className="bg-ceramic-base py-16 md:py-28 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-black text-ceramic-text-primary text-etched mb-4">
            Por que Aica?
          </h2>
          <p className="text-lg text-ceramic-text-secondary">
            Recursos desenvolvidos com você em mente para crescimento genuíno
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="group ceramic-tile rounded-[32px] p-8 hover:shadow-ceramic-elevated hover:-translate-y-1 transition-all duration-300 animate-fade-in-up focus-within:ring-2 focus-within:ring-ceramic-accent"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Icon Container */}
                <div className="flex justify-center mb-6">
                  <Icon
                    size={48}
                    className="text-ceramic-accent group-hover:text-ceramic-accent"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-ceramic-text-primary text-center mb-4">
                  {benefit.title}
                </h3>
                <p className="text-ceramic-text-secondary text-center leading-relaxed">
                  {benefit.description}
                </p>

                {/* Hover accent line */}
                <div
                  className="mt-6 h-1 bg-gradient-to-r from-transparent via-ceramic-highlight to-transparent group-hover:via-ceramic-accent transition-colors"
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
