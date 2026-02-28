import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const FleeingShard = ({ children, className, defaultPosition, floatAnim, containerRef }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fleeOffset, setFleeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let ticking = false;

    const handlePointer = (e: PointerEvent | TouchEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!ref.current || !containerRef.current) {
            ticking = false;
            return;
          }

          let clientX: number, clientY: number;
          if ('touches' in e) {
            if (e.touches.length > 0) {
              clientX = e.touches[0].clientX;
              clientY = e.touches[0].clientY;
            } else {
              ticking = false;
              return;
            }
          } else {
            clientX = (e as PointerEvent).clientX;
            clientY = (e as PointerEvent).clientY;
          }

          const rect = ref.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const distanceX = clientX - centerX;
          const distanceY = clientY - centerY;
          const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

          const threshold = 180;

          if (distance < threshold && distance > 0.1) {
            const force = (threshold - distance) / threshold;
            const push = force * 200;
            const angle = Math.atan2(distanceY, distanceX);

            let targetX = -Math.cos(angle) * push;
            let targetY = -Math.sin(angle) * push;

            const newLeft = rect.left + targetX;
            const newRight = rect.right + targetX;
            const newTop = rect.top + targetY;
            const newBottom = rect.bottom + targetY;

            if (newLeft < containerRect.left + 20) targetX += (containerRect.left + 20 - newLeft);
            if (newRight > containerRect.right - 20) targetX -= (newRight - (containerRect.right - 20));
            if (newTop < containerRect.top + 20) targetY += (containerRect.top + 20 - newTop);
            if (newBottom > containerRect.bottom - 20) targetY -= (newBottom - (containerRect.bottom - 20));

            setFleeOffset({ x: targetX, y: targetY });
          } else {
            setFleeOffset(prev => prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 });
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('pointermove', handlePointer);
    window.addEventListener('touchstart', handlePointer, { passive: true });
    window.addEventListener('touchmove', handlePointer, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('touchstart', handlePointer);
      window.removeEventListener('touchmove', handlePointer);
    };
  }, [containerRef]);

  return (
    <motion.div
      className="absolute z-10"
      style={{ ...defaultPosition }}
      animate={{ x: fleeOffset.x, y: fleeOffset.y }}
      transition={{ type: "spring", stiffness: 100, damping: 15, mass: 1 }}
    >
      <motion.div
        ref={ref}
        className={`pointer-events-auto ${className}`}
        animate={floatAnim.animate}
        transition={floatAnim.transition}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export function HeroSection() {
  const hero1Ref = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full flex flex-col relative overflow-hidden">
      <section ref={hero1Ref} className="relative min-h-[100dvh] flex flex-col items-center justify-center w-full pt-16 bg-[#E8E6DF] overflow-hidden">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex-1 flex flex-col items-center justify-center py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center text-center w-full relative h-[60vh] md:h-[70vh]"
          >
            {/* Chaos Shards (Fleeing from pointer) */}
            <div className="absolute inset-0 z-20 pointer-events-none">

              <FleeingShard
                containerRef={hero1Ref}
                defaultPosition={{ top: '15%', left: '10%' }}
                className="w-36 h-24 bg-red-100/90 rounded-md backdrop-blur-md border border-red-200 shadow-lg flex flex-col items-center justify-center text-red-500 font-mono text-sm shadow-red-900/10 cursor-default"
                floatAnim={{
                  animate: { y: [0, -20, 0], x: [0, 15, 0], rotate: [12, 5, 12] },
                  transition: { repeat: Infinity, duration: 6, ease: "easeInOut" }
                }}
              >
                <span className="font-bold text-lg pointer-events-none">125</span>
                <span className="pointer-events-none">não lidas</span>
              </FleeingShard>

              <FleeingShard
                containerRef={hero1Ref}
                defaultPosition={{ top: '20%', right: '15%' }}
                className="w-32 h-32 bg-blue-100/90 rounded-full backdrop-blur-md border border-blue-200 shadow-lg flex items-center justify-center text-blue-500 font-mono text-xs shadow-blue-900/10 cursor-default"
                floatAnim={{
                  animate: { y: [0, 25, 0], x: [0, -20, 0], rotate: [-6, -15, -6] },
                  transition: { repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }
                }}
              >
                <span className="pointer-events-none select-none">fatura_v3.pdf</span>
              </FleeingShard>

              <FleeingShard
                containerRef={hero1Ref}
                defaultPosition={{ bottom: '15%', left: '20%' }}
                className="w-48 h-16 bg-green-100/90 rounded-lg backdrop-blur-md border border-green-200 shadow-lg flex items-center justify-center text-green-600 font-mono text-xs shadow-green-900/10 cursor-default"
                floatAnim={{
                  animate: { x: [0, 20, 0], y: [0, 10, 0], rotate: [3, -2, 3] },
                  transition: { repeat: Infinity, duration: 8, ease: "easeInOut", delay: 0.5 }
                }}
              >
                <span className="pointer-events-none select-none">🔊 Áudio (3:42)</span>
              </FleeingShard>

              <FleeingShard
                containerRef={hero1Ref}
                defaultPosition={{ bottom: '20%', right: '25%' }}
                className="w-24 h-24 bg-amber-100/90 rounded-md backdrop-blur-md border border-amber-300 shadow-lg flex flex-col items-center justify-center text-amber-600 font-mono text-sm font-bold shadow-amber-900/10 cursor-default"
                floatAnim={{
                  animate: { rotate: [45, 135, 225, 315, 45], y: [0, -15, 0] },
                  transition: { rotate: { repeat: Infinity, duration: 12, ease: "linear" }, y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }
                }}
              >
                <span className="pointer-events-none -rotate-45 select-none text-center block" style={{ animation: "counterRotate 12s linear infinite" }}>
                  Atrasado
                </span>
              </FleeingShard>

            </div>

            <div className="relative z-10 flex flex-col items-center pointer-events-none">
              <h1 className="text-4xl md:text-7xl font-black text-ceramic-text-primary tracking-tighter leading-[1.1] max-w-4xl max-auto drop-shadow-md">
                Você não precisa de mais um app.<br />
                <span className="text-ceramic-text-primary">Você precisa de espaço.</span>
              </h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-16 text-ceramic-text-secondary text-sm font-bold tracking-widest uppercase flex flex-col items-center gap-4"
              >
                <span>Deslize para baixo</span>
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-px h-12 bg-gradient-to-b from-ceramic-text-secondary to-transparent"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Hero 2: A Forja (Sistema Operacional) ── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden w-full bg-ceramic-base pt-16">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex-1 flex flex-col items-center justify-center py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="w-full max-w-4xl relative"
          >
            {/* Thread background effect on enter */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{
                boxShadow: ['0px 0px 0px 0px rgba(217,119,6,0)', '0px 0px 0px 10px rgba(217,119,6,0.3)', '0px 0px 0px 0px rgba(217,119,6,0)'],
              }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className="absolute inset-0 rounded-3xl z-0 pointer-events-none"
            />

            {/* Born OS Card */}
            <div className="w-full bg-ceramic-base rounded-[2rem] ceramic-card p-8 md:p-14 relative overflow-hidden z-10 shadow-2xl shadow-amber-900/5">
              <div className="absolute top-0 left-0 w-full h-[6px] bg-amber-600 opacity-90" />

              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary tracking-tighter leading-tight mb-5">
                    Seu sistema operacional <br className="hidden md:block" />
                    <span className="text-amber-600 drop-shadow-sm">tátil e unificado.</span>
                  </h2>
                  <p className="text-lg md:text-xl text-ceramic-text-secondary font-medium leading-relaxed mb-8">
                    Deixe a IA processar o caos de mensagens, PDFs e planilhas, enquanto você trabalha em uma interface desenhada para a clareza.
                  </p>
                  <button
                    onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-8 py-4 rounded-full font-bold text-lg md:text-xl text-white transition-all hover:scale-[1.03] active:scale-[0.98] bg-amber-600 shadow-[8px_8px_24px_rgba(180,83,9,0.3)] hover:bg-amber-700 w-full sm:w-auto cursor-pointer relative z-20"
                  >
                    Moldar minha rotina
                  </button>
                </div>

                <div className="w-full md:w-1/3 flex flex-col gap-4">
                  <div className="h-14 bg-ceramic-base ceramic-shadow rounded-2xl flex items-center px-5 gap-4 hover:scale-[1.02] transition-transform">
                    <div className="w-5 h-5 rounded-full bg-ceramic-success shadow-inner" />
                    <div className="h-2 w-24 bg-ceramic-text-secondary/20 rounded-full" />
                  </div>
                  <div className="h-14 bg-[#DEDCD5] shadow-inner rounded-2xl flex items-center px-5 gap-4 scale-[0.98]">
                    <div className="w-5 h-5 rounded-full bg-amber-500 shadow-inner" />
                    <div className="h-2 w-32 bg-amber-600/20 rounded-full" />
                  </div>
                  <div className="h-14 bg-ceramic-base ceramic-shadow rounded-2xl flex items-center px-5 gap-4 hover:scale-[1.02] transition-transform">
                    <div className="w-5 h-5 rounded-full bg-ceramic-info shadow-inner" />
                    <div className="h-2 w-16 bg-ceramic-text-secondary/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes counterRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}} />
    </div>
  );
}
