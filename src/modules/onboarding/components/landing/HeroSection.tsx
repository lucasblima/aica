import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onSignUpClick: () => void;
  onLearnMoreClick: () => void;
}

export function HeroSection({ onSignUpClick, onLearnMoreClick }: HeroSectionProps) {
  return (
    <section className="bg-gradient-to-br from-[#F8F7F5] to-[#F0F5FF] py-16 md:py-24 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] leading-tight">
              Conheça a si mesmo.
              <br />
              <span className="bg-gradient-to-r from-[#6B9EFF] to-[#845EF7] bg-clip-text text-transparent">
                Transforme sua vida.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[#5C554B] leading-relaxed">
              Aica é seu companheiro pessoal para autoconhecimento e crescimento. Registre seus momentos, receba insights personalizados, e observe as transformações acontecerem.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={onSignUpClick}
                className="inline-flex items-center justify-center px-8 py-3 bg-[#6B9EFF] text-white font-600 rounded-lg hover:bg-[#5A8FEF] transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2"
                aria-label="Start creating your free account"
              >
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>

              <button
                onClick={onLearnMoreClick}
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-[#6B9EFF] text-[#6B9EFF] font-600 rounded-lg hover:bg-[#F0F5FF] transition-all focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2"
                aria-label="Learn more about Aica"
              >
                Saber Mais
              </button>
            </div>

            {/* Trust Badge */}
            <p className="text-sm text-[#948D82] pt-4">
              Versão beta gratuita • Sem cartão de crédito necessário
            </p>
          </div>

          {/* Illustration */}
          <div className="hidden md:flex justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative w-96 h-96">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#6B9EFF]/20 via-[#845EF7]/10 to-[#FF922B]/5 rounded-3xl animate-pulse" />

              {/* Decorative circles */}
              <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-[#6B9EFF]/10 blur-2xl" />
              <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-[#845EF7]/10 blur-3xl" />
              <div className="absolute top-32 right-5 w-20 h-20 rounded-full bg-[#FF922B]/5 blur-2xl" />

              {/* Center accent */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#6B9EFF] to-[#845EF7] opacity-10 blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
