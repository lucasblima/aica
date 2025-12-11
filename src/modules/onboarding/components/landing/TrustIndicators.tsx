import React from 'react';
import { Sparkles, Lock, Users } from 'lucide-react';

export function TrustIndicators() {
  return (
    <section className="bg-white py-16 md:py-24 px-6 md:px-8 border-t border-[#E8E6E0]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Beta Status */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0s' }}>
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-[#FFF3E0]">
                <Sparkles
                  size={32}
                  color="#FF922B"
                  className="text-[#FF922B]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <h3 className="font-bold text-lg text-[#2B1B17] mb-2">
              Versão Beta
            </h3>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              Construída com feedback de early adopters. Seu input direto molda o futuro de Aica.
            </p>
          </div>

          {/* Privacy & Security */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-[#E8F5E9]">
                <Lock
                  size={32}
                  color="#51CF66"
                  className="text-[#51CF66]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <h3 className="font-bold text-lg text-[#2B1B17] mb-2">
              Privacidade em Primeiro Lugar
            </h3>
            <p className="text-sm text-[#5C554B] leading-relaxed">
              Seus dados nunca são vendidos. Criptografia de ponta a ponta. Você controla completamente sua privacidade.
            </p>
          </div>

          {/* User Stats */}
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-[#E3F2FD]">
                <Users
                  size={32}
                  color="#6B9EFF"
                  className="text-[#6B9EFF]"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-[#6B9EFF] mb-2">
                1000+
              </p>
              <p className="text-sm text-[#5C554B]">
                Usuários já transformando suas vidas com Aica
              </p>
            </div>
          </div>
        </div>

        {/* Divider with trust quote */}
        <div className="mt-16 pt-12 border-t border-[#E8E6E0] text-center">
          <p className="text-[#948D82] italic text-sm">
            "Confiança é construída na transparência. Aqui na Aica, seus dados são sagrados."
          </p>
        </div>
      </div>
    </section>
  );
}
