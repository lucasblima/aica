import { motion } from 'framer-motion';

const modules = [
  { icon: '\u{1F4CB}', name: 'Atlas', subtitle: 'Tarefas', description: 'Organize tarefas com a Matriz de Eisenhower' },
  { icon: '\u2728', name: 'Journey', subtitle: 'Consciência', description: 'Diário inteligente com reflexões e emoções' },
  { icon: '\u{1F399}\uFE0F', name: 'Studio', subtitle: 'Podcast', description: 'Produza podcasts do briefing à gravação' },
  { icon: '\u{1F4D1}', name: 'Grants', subtitle: 'Captação', description: 'Encontre editais e monte propostas com IA' },
  { icon: '\u{1F4B0}', name: 'Finance', subtitle: 'Finanças', description: 'Gestão financeira pessoal inteligente' },
  { icon: '\u{1F91D}', name: 'Connections', subtitle: 'Rede', description: 'CRM pessoal e networking estratégico' },
  { icon: '\u{1F3CB}\uFE0F', name: 'Flux', subtitle: 'Treinos', description: 'Gestão de treinos para coaches e atletas' },
  { icon: '\u{1F4C5}', name: 'Agenda', subtitle: 'Agenda', description: 'Calendário integrado com todos os módulos' },
];

export function ModulesOverviewSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
          8 módulos para organizar sua vida
        </h2>
        <p className="text-lg text-ceramic-text-secondary font-medium uppercase tracking-widest opacity-60">
          Cada aspecto da sua rotina, integrado por IA
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.map((mod, index) => (
          <motion.div
            key={mod.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 * index }}
            className="p-6 text-center ceramic-card-light group hover:ceramic-card transition-all duration-300"
          >
            <div className="text-4xl mb-3 transition-transform group-hover:scale-110">
              {mod.icon}
            </div>
            <h3 className="text-lg font-black text-ceramic-text-primary tracking-tight">
              {mod.name}
            </h3>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-2">
              {mod.subtitle}
            </p>
            <p className="text-sm text-ceramic-text-secondary leading-relaxed">
              {mod.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
