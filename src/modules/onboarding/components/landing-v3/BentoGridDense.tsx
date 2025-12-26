import React from 'react';
import { Lock, Zap, Target, Smartphone, Users } from 'lucide-react';
import { BentoCardDense } from './BentoCardDense';

/**
 * BentoGridDense - High-Density Feature Grid
 *
 * Apple-inspired bento grid with giant background icons.
 * Features core value propositions with visual density.
 */
export function BentoGridDense() {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-ceramic-text-primary tracking-tighter mb-4">
            Projetado para você
          </h2>
          <p className="text-lg md:text-xl text-ceramic-text-secondary max-w-2xl mx-auto">
            Cada detalhe pensado para seu crescimento pessoal
          </p>
        </div>

        {/* Bento Grid - The Density */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <BentoCardDense
            title="Privacidade Absoluta"
            description="Seus dados são só seus. Criptografia de ponta a ponta, sem rastreamento."
            icon={Lock}
            gradient="from-blue-50 to-blue-100"
            delay={0}
          />
          <BentoCardDense
            title="Design Cerâmico"
            description="Interface que você sente. Texturas tácteis, sombras naturais."
            icon={Smartphone}
            gradient="from-amber-50 to-amber-100"
            delay={0.1}
          />
          <BentoCardDense
            title="Autoconhecimento"
            description="Registre momentos, reflita, evolua. Gamificação personalizada."
            icon={Target}
            gradient="from-purple-50 to-purple-100"
            delay={0.2}
          />
          <BentoCardDense
            title="Velocidade da Fala"
            description="Capture pensamentos instantaneamente. Voz para texto em tempo real."
            icon={Zap}
            gradient="from-green-50 to-green-100"
            delay={0.3}
            className="md:col-span-2"
          />
          <BentoCardDense
            title="Comunidade"
            description="Conecte-se com pessoas na mesma jornada. Compartilhe conquistas."
            icon={Users}
            gradient="from-pink-50 to-pink-100"
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
}
