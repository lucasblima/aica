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
      className="bg-gradient-to-b from-[#F8F7F5] to-white py-16 md:py-24 px-6 md:px-8"
    >
      <div className="max-w-[600px] mx-auto text-center animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl font-bold text-[#2B1B17] mb-4 leading-tight">
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
            className="inline-flex items-center justify-center px-8 md:px-10 py-3 bg-[#6B9EFF] text-white font-600 rounded-lg hover:bg-[#5A8FEF] transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2"
            aria-label="Create free account and start your journey"
          >
            Criar Conta Gratuita
            <ArrowRight size={18} className="ml-2" />
          </button>

          {/* Secondary CTA */}
          {onDemoClick && (
            <button
              onClick={onDemoClick}
              className="inline-flex items-center justify-center px-8 md:px-10 py-3 border-2 border-[#6B9EFF] text-[#6B9EFF] font-600 rounded-lg hover:bg-[#F0F5FF] transition-all focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2"
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
        <div className="mt-8 h-1 w-16 bg-gradient-to-r from-[#6B9EFF] to-[#845EF7] mx-auto rounded-full" />
      </div>
    </section>
  );
}
