import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

interface MinimalFooterProps {
  /** Handler for login/signup action */
  onGetStarted?: () => void;
}

/**
 * MinimalFooter Component
 *
 * Minimalist footer following the Digital Ceramic aesthetic.
 * Slightly darker cream background (#DDD0C1) to ground the page.
 *
 * Content:
 * - Logo (centered or left-aligned)
 * - Essential links (Privacy, Terms, Contact)
 * - Subtle "Designed for Growth" tagline
 * - Copyright
 */
export function MinimalFooter({ onGetStarted }: MinimalFooterProps) {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'Privacidade', href: '/privacy' },
    { label: 'Termos', href: '/terms' },
    { label: 'Contato', href: 'mailto:hello@aica.app' },
  ];

  return (
    <footer
      className="py-12 md:py-16 px-6 md:px-8"
      style={{ backgroundColor: '#DDD0C1' }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Logo variant="inverted" width={48} className="rounded-lg" />
          </motion.div>

          {/* Links */}
          <motion.nav
            className="flex items-center gap-6 md:gap-8"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-ceramic-text-primary hover:text-ceramic-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2 focus:ring-offset-[#DDD0C1] rounded px-1 py-0.5"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>

          {/* CTA (optional) */}
          {onGetStarted && (
            <motion.button
              onClick={onGetStarted}
              className="text-sm font-semibold text-ceramic-accent hover:text-ceramic-accent-dark transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2 focus:ring-offset-[#DDD0C1] rounded px-2 py-1"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Comecar
            </motion.button>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-ceramic-text-secondary/20 mb-8" />

        {/* Bottom Row */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Tagline */}
          <p className="text-xs text-ceramic-text-secondary italic">
            Designed for Growth
          </p>

          {/* Copyright */}
          <p className="text-xs text-ceramic-text-secondary">
            {currentYear} Aica. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}

export default MinimalFooter;
