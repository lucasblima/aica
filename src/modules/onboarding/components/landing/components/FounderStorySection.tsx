import { motion } from 'framer-motion';

export function FounderStorySection() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="p-10 md:p-14 ceramic-card text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 opacity-40" />

        {/* Avatar */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[4px_4px_12px_rgba(180,83,9,0.2)]">
          <span className="text-2xl font-black text-white tracking-tight">LB</span>
        </div>

        {/* Quote */}
        <blockquote className="text-lg md:text-xl text-ceramic-text-primary font-medium italic leading-relaxed max-w-2xl mx-auto mb-6">
          &ldquo;Eu vivia no caos &mdash; 30 grupos de WhatsApp, tarefas perdidas em mensagens,
          reflex&otilde;es que desapareciam no scroll infinito. Como desenvolvedor, sabia que a IA
          podia resolver isso. Ent&atilde;o criei o AICA: um sistema que transforma o ru&iacute;do
          digital em clareza para sua vida pessoal e profissional.&rdquo;
        </blockquote>

        {/* Attribution */}
        <p className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-widest">
          Lucas Boscacci Lima
        </p>
        <p className="text-xs text-ceramic-text-secondary/70 mt-1 tracking-wide">
          Fundador &amp; Desenvolvedor
        </p>
      </motion.div>
    </section>
  );
}
