import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChaosPanel } from './components/ChaosPanel';
import { OrderPanel } from './components/OrderPanel';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { demoProcessingService } from './services/demoProcessingService';
import { AuthSheet } from '@/components/layout';
import type { DemoMessage, ProcessedModules, ProcessingStage } from './types';

/**
 * LandingPage - "Ordem ao Caos" Concept
 *
 * Design Philosophy: Transform chaos into order
 * - Left panel: Chaotic WhatsApp messages floating around
 * - Right panel: Organized modules (Atlas, Journey, Studio, Connections)
 * - Processing pipeline shows the transformation in real-time
 *
 * Features:
 * - Fully responsive (mobile-first)
 * - WCAG AA accessible
 * - Framer Motion animations
 * - iOS-style auth sheet integration
 * - Digital Ceramic design system (Neumorphic)
 */
export function LandingPage() {
  const navigate = useNavigate();
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);

  // Demo state - using functional form for consistent initialization
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
    <div className="min-h-screen bg-ceramic-base font-sans">
      {/* SEO Meta Tags */}
      <meta name="description" content="Aica Life OS - Ordem ao Caos. Transforme suas mensagens desorganizadas em acao estruturada com IA." />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#F0EFE9" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ceramic-base/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌱</span>
            <span className="font-black text-xl text-ceramic-text-primary">Aica</span>
          </div>
          <button
            onClick={handleOpenLogin}
            className="px-6 py-2.5 rounded-full font-semibold text-white transition-all hover:scale-105 bg-gradient-to-br from-[#5C554B] to-[#3A3632] shadow-[0_4px_12px_rgba(92,85,75,0.3)]"
          >
            Entrar
          </button>
        </div>
      </header>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-black text-ceramic-text-primary mb-6 leading-tight">
              Do{' '}
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Caos
              </span>{' '}
              a{' '}
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Ordem
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-ceramic-text-secondary max-w-3xl mx-auto">
              Transforme suas mensagens do WhatsApp em tarefas, reflexoes e conexoes organizadas automaticamente por IA
            </p>
          </motion.div>
        </section>

        {/* Processing Pipeline (visible during processing) */}
        <AnimatePresence>
          {isProcessing && processingStage && (
            <ProcessingPipeline
              stage={processingStage}
              messageCount={messages.length}
            />
          )}
        </AnimatePresence>

        {/* Main Demo Area - Chaos to Order Transformation */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          {/* CTA Button */}
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
                className="px-10 py-4 rounded-full font-bold text-lg text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-blue-500 via-purple-500 to-orange-500 shadow-[0_8px_24px_rgba(59,130,246,0.35)]"
              >
                {isProcessing ? 'Processando...' : 'Processar Meu Caos'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleResetDemo}
                  className="px-8 py-4 rounded-full font-bold text-lg text-ceramic-text-secondary transition-all hover:scale-105 bg-ceramic-base ceramic-shadow"
                >
                  Reiniciar Demo
                </button>
                <button
                  onClick={handleOpenLogin}
                  className="px-10 py-4 rounded-full font-bold text-lg text-white transition-all hover:scale-105 bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_8px_24px_rgba(16,185,129,0.35)]"
                >
                  Comecar Agora
                </button>
              </>
            )}
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-ceramic-text-primary mb-4">
              Como funciona
            </h2>
            <p className="text-lg text-ceramic-text-secondary">
              Sua rotina, seus dados, organizados automaticamente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '📱',
                title: 'Conecte suas mensagens',
                description: 'Importe conversas do WhatsApp que voce deseja processar'
              },
              {
                icon: '🧠',
                title: 'IA classifica tudo',
                description: 'Embeddings e analise semantica identificam tarefas, emocoes e relacionamentos'
              },
              {
                icon: '✨',
                title: 'Organize sua vida',
                description: 'Modulos estruturados prontos para acao e reflexao'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="p-8 rounded-2xl text-center ceramic-card"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-ceramic-text-secondary">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="p-12 rounded-3xl bg-gradient-to-br from-ceramic-base to-[#E5E3DA] shadow-[8px_8px_24px_rgba(163,158,145,0.25),-8px_-8px_24px_rgba(255,255,255,0.8)]"
          >
            <h2 className="text-3xl md:text-4xl font-black text-ceramic-text-primary mb-4">
              Pronto para transformar seu caos?
            </h2>
            <p className="text-lg text-ceramic-text-secondary mb-8">
              Comece gratuitamente e descubra como a Aica pode organizar sua vida
            </p>
            <button
              onClick={handleOpenLogin}
              className="px-12 py-5 rounded-full font-bold text-xl text-white transition-all hover:scale-105 bg-gradient-to-br from-[#5C554B] to-[#3A3632] shadow-[0_8px_24px_rgba(92,85,75,0.35)]"
            >
              Criar Conta Gratis
            </button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <span className="font-bold text-ceramic-text-primary">Aica Life OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-ceramic-text-secondary">
            <a href="/privacy" className="hover:text-ceramic-text-primary transition-colors">
              Privacidade
            </a>
            <a href="/terms" className="hover:text-ceramic-text-primary transition-colors">
              Termos
            </a>
            <span>&copy; 2025 Aica</span>
          </div>
        </div>
      </footer>

      {/* Skip to main content link (accessibility) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:p-4 focus:bg-ceramic-accent focus:text-white focus:rounded"
      >
        Pular para conteudo principal
      </a>

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
