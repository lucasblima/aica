import React from 'react';
import { ArrowRight, CheckCircle2, Circle, Calendar, Target, Flame, Star } from 'lucide-react';

interface HeroSectionProps {
  onSignUpClick: () => void;
  onLearnMoreClick: () => void;
}

// App Mockup Component - Visual representation of "Meu Dia"
function AppMockup() {
  return (
    <div className="relative">
      {/* Phone Frame */}
      <div className="bg-[#2B1B17] rounded-[3rem] p-3 shadow-2xl">
        {/* Screen */}
        <div className="bg-ceramic-base rounded-[2.5rem] overflow-hidden">
          {/* Notch */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-24 h-6 bg-[#2B1B17] rounded-full" />
          </div>

          {/* App Content */}
          <div className="px-4 pb-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-xs text-ceramic-text-secondary">Dezembro 15</p>
                <h3 className="text-lg font-bold text-ceramic-text-primary">Meu Dia</h3>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-ceramic-accent" />
                <span className="text-sm font-bold text-ceramic-accent">7</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="ceramic-inset rounded-xl p-2 text-center">
                <p className="text-xs text-ceramic-text-secondary">Tarefas</p>
                <p className="text-lg font-bold text-ceramic-text-primary">12</p>
              </div>
              <div className="ceramic-inset rounded-xl p-2 text-center">
                <p className="text-xs text-ceramic-text-secondary">Feitas</p>
                <p className="text-lg font-bold text-green-600">8</p>
              </div>
              <div className="ceramic-inset rounded-xl p-2 text-center">
                <p className="text-xs text-ceramic-text-secondary">XP Hoje</p>
                <p className="text-lg font-bold text-ceramic-accent">240</p>
              </div>
            </div>

            {/* Mini Eisenhower Matrix */}
            <div className="ceramic-card rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-ceramic-accent" />
                <span className="text-xs font-semibold text-ceramic-text-primary">Matriz de Prioridades</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                  <p className="text-[10px] text-red-700 font-medium">Urgente</p>
                  <p className="text-xs text-red-900">3 tarefas</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                  <p className="text-[10px] text-amber-700 font-medium">Importante</p>
                  <p className="text-xs text-amber-900">5 tarefas</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-[10px] text-blue-700 font-medium">Delegar</p>
                  <p className="text-xs text-blue-900">2 tarefas</p>
                </div>
                <div className="bg-stone-100 rounded-lg p-2 border border-stone-200">
                  <p className="text-[10px] text-stone-600 font-medium">Eliminar</p>
                  <p className="text-xs text-stone-700">2 tarefas</p>
                </div>
              </div>
            </div>

            {/* Task List Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-ceramic-accent" />
                <span className="text-xs font-semibold text-ceramic-text-primary">Próximas Tarefas</span>
              </div>

              {/* Task Item 1 - Completed */}
              <div className="ceramic-card rounded-xl p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ceramic-text-secondary line-through truncate">Reunião de equipe</p>
                  <p className="text-[10px] text-ceramic-text-secondary">09:00 • +30 XP</p>
                </div>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>

              {/* Task Item 2 - In Progress */}
              <div className="ceramic-card rounded-xl p-3 flex items-center gap-3 border-l-4 border-ceramic-accent">
                <Circle className="w-5 h-5 text-ceramic-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ceramic-text-primary font-medium truncate">Revisar proposta</p>
                  <p className="text-[10px] text-ceramic-text-secondary">14:00 • Urgente</p>
                </div>
              </div>

              {/* Task Item 3 */}
              <div className="ceramic-card rounded-xl p-3 flex items-center gap-3 opacity-80">
                <Circle className="w-5 h-5 text-ceramic-text-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ceramic-text-primary truncate">Planejar semana</p>
                  <p className="text-[10px] text-ceramic-text-secondary">18:00 • +20 XP</p>
                </div>
              </div>
            </div>

            {/* Bottom Nav Hint */}
            <div className="flex justify-center pt-2">
              <div className="w-32 h-1 bg-ceramic-text-secondary/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute -top-4 -right-4 ceramic-card rounded-2xl px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ceramic-accent to-amber-600 flex items-center justify-center">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <p className="text-[10px] text-ceramic-text-secondary">Nível</p>
            <p className="text-sm font-bold text-ceramic-text-primary">Explorador</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ onSignUpClick, onLearnMoreClick }: HeroSectionProps) {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8 relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
          <div className="hidden lg:flex justify-center lg:justify-end">
            <div className="transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
              <AppMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
