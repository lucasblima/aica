import React from 'react';
import { Brain, Zap, Lock } from 'lucide-react';

const benefits = [
  {
    icon: Brain,
    color: '#6B9EFF',
    title: 'Autoconhecimento Profundo',
    description: 'Entenda seus padrões emocionais, comportamentos e valores através de registro estruturado de momentos. Veja como você realmente é, não como imagina ser.'
  },
  {
    icon: Zap,
    color: '#845EF7',
    title: 'Crescimento Personalizado',
    description: 'Recomendações customizadas baseadas em seu contexto de vida. Se você está focado em saúde, finanças ou relacionamentos, Aica aprende e se adapta.'
  },
  {
    icon: Lock,
    color: '#51CF66',
    title: 'Privacidade & Segurança',
    description: 'Seus dados são seus. Criptografia end-to-end, sem venda de dados, sem rastreamento. Você controla completamente o que é compartilhado.'
  }
];

export function ValueProposition() {
  return (
    <section className="bg-white py-16 md:py-28 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2B1B17] mb-4">
            Por que Aica?
          </h2>
          <p className="text-lg text-[#5C554B]">
            Recursos desenvolvidos com você em mente para crescimento genuíno
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="group bg-[#F8F7F5] border border-[#E8E6E0] rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in-up focus-within:ring-2 focus-within:ring-[#6B9EFF]"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Icon Container */}
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-white/50 group-hover:bg-white transition-colors">
                    <Icon
                      size={48}
                      color={benefit.color}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-[#2B1B17] text-center mb-4">
                  {benefit.title}
                </h3>
                <p className="text-[#5C554B] text-center leading-relaxed">
                  {benefit.description}
                </p>

                {/* Hover accent line */}
                <div
                  className="mt-6 h-1 bg-gradient-to-r from-transparent via-[#E8E6E0] to-transparent group-hover:via-[#6B9EFF] transition-colors"
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
