import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  onSignUpClick: () => void;
  onDemoClick?: () => void;
}

export function CTASection({ onSignUpClick, onDemoClick }: CTASectionProps) {
  return (
    <section
      id="cta"
      className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8"
    >
      <div className="max-w-[600px] mx-auto text-center animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl text-ceramic-text-primary text-etched font-black mb-4 leading-tight">
          Pronto para começar sua transformação?
        </h2>

        <p className="text-lg text-[#5C554B] mb-8 leading-relaxed">
          Junte-se a milhares de pessoas descobrindo a si mesmas através de Aica.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          {/* Primary CTA */}
          <button
            onClick={onSignUpClick}
            className="ceramic-shadow bg-ceramic-accent text-[#1F1710] rounded-full px-10 py-4 hover:bg-[#C2850A] inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2"
            aria-label="Create free account and start your journey"
          >
            Criar Conta Gratuita
            <ArrowRight size={18} className="ml-2" />
          </button>

          {/* Secondary CTA */}
          {onDemoClick && (
            <button
              onClick={onDemoClick}
              className="ceramic-inset text-ceramic-text-primary hover:text-ceramic-accent rounded-full px-10 py-4 inline-flex items-center justify-center font-600 transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2"
              aria-label="Schedule a demo with our team"
            >
              Agendar Demo
            </button>
          )}
        </div>

        {/* Trust Badge */}
        <p className="text-xs text-[#948D82] font-medium">
          Sem cartão de crédito necessário • Acesso imediato
        </p>

        {/* Accent Line */}
        <div className="mt-8 h-1 w-24 bg-ceramic-accent mx-auto rounded-full" />
      </div>
    </section>
  );
}
