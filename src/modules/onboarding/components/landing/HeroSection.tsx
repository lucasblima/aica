import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onSignUpClick: () => void;
  onLearnMoreClick: () => void;
}

export function HeroSection({ onSignUpClick, onLearnMoreClick }: HeroSectionProps) {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8 relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-black text-etched text-ceramic-text-primary leading-tight">
              Conheça a si mesmo.
              <br />
              <span className="text-ceramic-accent">
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
                className="ceramic-shadow bg-ceramic-accent text-[#1F1710] rounded-full px-10 py-4 hover:bg-[#C2850A] transition-all inline-flex items-center justify-center font-semibold focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2"
                aria-label="Start creating your free account"
              >
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>

              <button
                onClick={onLearnMoreClick}
                className="ceramic-inset text-ceramic-text-primary hover:text-ceramic-accent rounded-full px-10 py-4 inline-flex items-center justify-center font-600 transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2"
                aria-label="Learn more about Aica"
              >
                Saber Mais
              </button>
            </div>

            {/* Trust Badge */}
            <p className="text-sm text-ceramic-text-secondary pt-4">
              Comece sua jornada. Sem custo.
            </p>
          </div>

          {/* App Mockup Display */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[500px]">
            <div className="ceramic-card rounded-3xl p-4 shadow-2xl transform rotate-[-5deg] hover:rotate-0 transition-transform duration-500">
              <div className="bg-ceramic-base rounded-2xl aspect-[9/16] max-h-[600px] flex items-center justify-center">
                <span className="text-ceramic-text-secondary text-sm">Meu Dia Preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
