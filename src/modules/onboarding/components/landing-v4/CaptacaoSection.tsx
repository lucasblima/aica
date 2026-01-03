import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, BarChart3, Shield } from 'lucide-react';

/**
 * CaptacaoSection - Seção para agências e deep dive
 *
 * Design Philosophy: Professional, enterprise-focused
 * Target: Agencies, consultants, and organizations
 */

interface Benefit {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    icon: Building2,
    title: 'White Label',
    description: 'Customize a plataforma com sua marca e ofereça aos seus clientes.'
  },
  {
    icon: Users,
    title: 'Multi-tenant',
    description: 'Gerencie múltiplos clientes em uma única instalação segura.'
  },
  {
    icon: BarChart3,
    title: 'Analytics Avançado',
    description: 'Relatórios agregados e insights para acompanhar resultados.'
  },
  {
    icon: Shield,
    title: 'LGPD/GDPR',
    description: 'Compliance total com regulamentações de privacidade.'
  }
];

export function CaptacaoSection() {
  return (
    <section className="bg-gradient-to-b from-ceramic-accent/5 to-ceramic-base py-20 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-bold text-ceramic-accent uppercase tracking-wider mb-3">
            Para Agências & Empresas
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-ceramic-text-primary tracking-tight mb-6">
            Escale seu negócio
          </h2>
          <p className="text-xl text-ceramic-text-secondary max-w-3xl mx-auto font-light">
            Implemente Aica Life OS para seus clientes e transforme desenvolvimento pessoal
            em um serviço premium e recorrente
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="ceramic-card p-8 rounded-2xl hover:shadow-[12px_12px_24px_rgba(163,158,145,0.20),-12px_-12px_24px_rgba(255,255,255,0.95)] transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="
                  w-12 h-12
                  ceramic-inset
                  rounded-xl
                  flex items-center justify-center
                  flex-shrink-0
                ">
                  <benefit.icon className="w-6 h-6 text-ceramic-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-ceramic-text-primary mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-ceramic-text-secondary font-light">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Deep Dive CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="ceramic-card p-10 md:p-12 rounded-3xl text-center"
        >
          <h3 className="text-3xl md:text-4xl font-black text-ceramic-text-primary mb-4">
            Agende uma demonstração personalizada
          </h3>
          <p className="text-lg text-ceramic-text-secondary mb-8 max-w-2xl mx-auto font-light">
            Converse com nosso time para entender como Aica Life OS pode se integrar
            ao seu portfólio de serviços e gerar receita recorrente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              className="
                px-10 py-5 rounded-full
                bg-ceramic-base text-ceramic-text-primary
                font-bold text-lg
                shadow-[8px_8px_16px_rgba(163,158,145,0.25),-8px_-8px_16px_rgba(255,255,255,0.95)]
                hover:shadow-[12px_12px_24px_rgba(163,158,145,0.30),-12px_-12px_24px_rgba(255,255,255,1)]
                hover:text-ceramic-accent
                transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ceramic-accent
              "
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Agendar Demo
            </motion.button>

            <motion.a
              href="mailto:contato@aica.com"
              className="
                px-8 py-4 rounded-full
                text-ceramic-text-secondary
                font-semibold text-base
                hover:text-ceramic-text-primary
                transition-colors duration-200
              "
              whileHover={{ scale: 1.05 }}
            >
              Enviar email →
            </motion.a>
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-ceramic-text-secondary/10">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-3xl font-black text-ceramic-accent mb-1">98%</p>
                <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">Satisfação</p>
              </div>
              <div>
                <p className="text-3xl font-black text-ceramic-accent mb-1">50+</p>
                <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">Agências</p>
              </div>
              <div>
                <p className="text-3xl font-black text-ceramic-accent mb-1">10k+</p>
                <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">Usuários</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
