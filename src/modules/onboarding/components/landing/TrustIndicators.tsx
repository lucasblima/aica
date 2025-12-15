import React from 'react';
import { Sparkles, Lock, Users } from 'lucide-react';

export function TrustIndicators() {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8 border-t border-ceramic-highlight">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Beta Status */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0s' }}>
            <div className="flex justify-center mb-4">
              <Sparkles
                className="text-ceramic-accent w-8 h-8"
                aria-hidden="true"
              />
            </div>
            <h3 className="font-bold text-lg text-ceramic-text-primary mb-2">
              Versão Beta
            </h3>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              Construída com feedback de early adopters. Seu input direto molda o futuro de Aica.
            </p>
          </div>

          {/* Privacy & Security */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center mb-4">
              <Lock
                className="text-ceramic-accent w-8 h-8"
                aria-hidden="true"
              />
            </div>
            <h3 className="font-bold text-lg text-ceramic-text-primary mb-2">
              Privacidade em Primeiro Lugar
            </h3>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              Seus dados nunca são vendidos. Criptografia de ponta a ponta. Você controla completamente sua privacidade.
            </p>
          </div>

          {/* User Stats */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-center mb-4">
              <Users
                className="text-ceramic-accent w-8 h-8"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-ceramic-accent mb-2">
                1000+
              </p>
              <p className="text-sm text-[#5C554B]">
                Usuários já transformando suas vidas com Aica
              </p>
            </div>
          </div>
        </div>

        {/* Divider with trust quote */}
        <div className="mt-16 pt-12 border-t border-ceramic-highlight text-center">
          <p className="text-ceramic-text-secondary italic text-sm">
            "Confiança é construída na transparência. Aqui na Aica, seus dados são sagrados."
          </p>
        </div>
      </div>
    </section>
  );
}
