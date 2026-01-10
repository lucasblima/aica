import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChaosPanel } from './components/ChaosPanel';
import { OrderPanel } from './components/OrderPanel';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { demoProcessingService } from './services/demoProcessingService';
import { AuthSheet } from '@/components/layout';
import { Logo } from '@/components/ui';
import type { DemoMessage, ProcessedModules, ProcessingStage } from './types';

/**
 * LandingPage - "Ordem ao Caos" Concept
 */
export function LandingPage() {
  const navigate = useNavigate();
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);

  // Demo state
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    demoProcessingService.generateDemoMessages()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);
  const [processedModules, setProcessedModules] = useState<ProcessedModules | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle processing demo
  const handleProcessChaos = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProcessedModules(null);

    await demoProcessingService.processMessages(
      messages,
      (stage) => setProcessingStage(stage as ProcessingStage),
      (modules) => {
        setProcessedModules(modules);
        setIsProcessing(false);
        setProcessingStage(null);
      }
    );
  };

  // Reset demo
  const handleResetDemo = () => {
    setProcessedModules(null);
    setIsProcessing(false);
    setProcessingStage(null);
    const newMessages = demoProcessingService.generateDemoMessages();
    setMessages(newMessages);
  };

  // Auth handlers
  const handleOpenLogin = () => {
    setIsAuthSheetOpen(true);
  };

  const handleAuthSuccess = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ceramic-base font-sans overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ceramic-base/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="default" width={44} className="rounded-lg" />
            <span className="font-black text-2xl text-ceramic-text-primary tracking-tighter">Aica</span>
          </div>
          <button
            onClick={handleOpenLogin}
            className="px-6 py-2.5 rounded-full font-bold text-sm text-white transition-all hover:scale-105 bg-[#5C554B] shadow-[4px_4px_10px_rgba(92,85,75,0.25)]"
          >
            Entrar
          </button>
        </div>
      </header>

      <main id="main" className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-8xl font-black text-ceramic-text-primary mb-8 leading-[0.9] tracking-tighter">
              A essência da <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-orange-500 bg-clip-text text-transparent">
                ordem
              </span>{' '}
              em meio ao caos.
            </h1>
            <p className="text-xl md:text-2xl text-ceramic-text-secondary max-w-2xl mx-auto font-medium leading-relaxed">
              O Life OS que refina suas conversas do WhatsApp em clareza absoluta. Tarefas, reflexões e conexões, destiladas por IA.
            </p>
          </motion.div>
        </section>

        {/* Processing Pipeline Area */}
        <div className="h-24 flex items-center justify-center mb-12">
          <AnimatePresence>
            {isProcessing && processingStage && (
              <ProcessingPipeline
                stage={processingStage}
                messageCount={messages.length}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Main Demo Area */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Chaos Panel */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ChaosPanel
                messages={messages}
                isProcessing={isProcessing}
              />
            </motion.div>

            {/* Right: Order Panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <OrderPanel
                modules={processedModules}
                isProcessing={isProcessing}
              />
            </motion.div>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex justify-center mt-12 gap-4"
          >
            {!processedModules ? (
              <button
                onClick={handleProcessChaos}
                disabled={isProcessing}
                className="px-12 py-5 rounded-full font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed bg-[#5C554B] shadow-[8px_8px_24px_rgba(92,85,75,0.25)]"
              >
                {isProcessing ? 'Destilando...' : 'Organizar meu WhatsApp'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleResetDemo}
                  className="px-8 py-4 rounded-full font-bold text-lg text-ceramic-text-secondary transition-all hover:scale-[1.02] bg-ceramic-base ceramic-shadow"
                >
                  Reiniciar
                </button>
                <button
                  onClick={handleOpenLogin}
                  className="px-12 py-5 rounded-full font-bold text-xl text-white transition-all hover:scale-[1.02] bg-[#B45309] shadow-[8px_8px_24px_rgba(180,83,9,0.25)]"
                >
                  Testar minha conexão
                </button>
              </>
            )}
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 py-16 mb-16 border-t border-white/20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
              Como funciona
            </h2>
            <p className="text-lg text-ceramic-text-secondary font-medium uppercase tracking-widest opacity-60">
              Sua rotina, seus dados, organizados automaticamente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '📱',
                title: 'Conecte suas mensagens',
                description: 'Importe conversas do WhatsApp que você deseja processar de forma segura.'
              },
              {
                icon: '🧠',
                title: 'IA classifica tudo',
                description: 'Nossa IA identifica tarefas, reflexões e conexões importantes na sua vida.'
              },
              {
                icon: '✨',
                title: 'Organize sua vida',
                description: 'Tenha uma visão clara e estruturada para agir e refletir com precisão.'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="p-10 text-center ceramic-card-light group hover:ceramic-card transition-all duration-300"
              >
                <div className="text-6xl mb-6 transition-transform group-hover:scale-110">{feature.icon}</div>
                <h3 className="text-2xl font-black text-ceramic-text-primary mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-ceramic-text-secondary font-medium leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Curiosity Section */}
        <section className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="p-16 ceramic-card relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-40" />
            <h2 className="text-4xl md:text-6xl font-black text-ceramic-text-primary mb-8 tracking-tighter leading-tight">
              A curiosidade é o primeiro passo <br /> para a ordem.
            </h2>
            <p className="text-xl text-ceramic-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Conecte seu WhatsApp e veja a mágica da destilação em tempo real. Sem burocracia, apenas clareza.
            </p>
            <button
              onClick={handleOpenLogin}
              className="px-20 py-8 rounded-full font-black text-2xl text-white transition-all hover:scale-[1.02] bg-[#5C554B] shadow-[12px_12px_32px_rgba(92,85,75,0.3)] hover:bg-[#3A3632]"
            >
              Testar minha conexão
            </button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <Logo variant="default" width={32} />
            <span className="font-black text-xl text-ceramic-text-primary tracking-tighter">Aica Life OS</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-bold text-ceramic-text-secondary uppercase tracking-widest">
            <a href="/privacy" className="hover:text-ceramic-text-primary transition-colors">Privacidade</a>
            <a href="/terms" className="hover:text-ceramic-text-primary transition-colors">Termos</a>
            <span className="opacity-40">&copy; 2025 Aica</span>
          </div>
        </div>
      </footer>

      {/* Auth Sheet */}
      <AuthSheet
        isOpen={isAuthSheetOpen}
        onClose={() => setIsAuthSheetOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default LandingPage;
