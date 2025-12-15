import React from 'react';
import { Linkedin, Twitter, Instagram, Mail, Github } from 'lucide-react';

const footerLinks = {
  company: {
    title: 'Empresa',
    links: [
      { label: 'Sobre Nós', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Carreiras', href: '#' },
      { label: 'Contato', href: '#' }
    ]
  },
  product: {
    title: 'Produto',
    links: [
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Roadmap', href: '#' },
      { label: 'FAQ', href: '#' }
    ]
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Política de Privacidade', href: '/privacy' },
      { label: 'Termos de Serviço', href: '/terms' },
      { label: 'Política de Cookies', href: '#' },
      { label: 'LGPD', href: '#' }
    ]
  },
  resources: {
    title: 'Recursos',
    links: [
      { label: 'Documentação', href: '#' },
      { label: 'Guias', href: '#' },
      { label: 'API', href: '#' },
      { label: 'Status', href: '#' }
    ]
  }
};

const socialLinks = [
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Mail, href: 'mailto:hello@aica.app', label: 'Email' },
  { icon: Github, href: '#', label: 'GitHub' }
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#E6D5C3] py-16 md:py-20 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold text-ceramic-text-primary mb-4">Aica</h3>
            <p className="text-sm text-ceramic-text-secondary leading-relaxed">
              Sua plataforma pessoal para autoconhecimento e crescimento transformacional.
            </p>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key} className="lg:col-span-1">
              <h4 className="font-semibold mb-4 text-ceramic-text-primary">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ceramic-text-primary hover:text-ceramic-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2 focus:ring-offset-[#E6D5C3] rounded px-1"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-ceramic-text-secondary/30 pt-8 mt-8">
          {/* Social & Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Copyright */}
            <div className="text-sm text-ceramic-text-secondary">
              <p>
                © {currentYear} Aica. Todos os direitos reservados.
              </p>
              <p className="text-xs mt-2">
                Feito com cuidado para seu crescimento pessoal.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex gap-6 items-center">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-ceramic-text-primary hover:text-ceramic-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2 focus:ring-offset-[#E6D5C3] rounded p-1"
                    aria-label={social.label}
                    target={social.href !== 'mailto:hello@aica.app' ? '_blank' : undefined}
                    rel={social.href !== 'mailto:hello@aica.app' ? 'noopener noreferrer' : undefined}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>

            {/* Status Badge */}
            <div className="text-xs text-ceramic-text-secondary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ceramic-accent" aria-hidden="true" />
              Todos os sistemas operacionais
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-8 border-t border-ceramic-text-secondary/30 text-center text-xs text-ceramic-text-secondary">
          <p>
            Aica é uma plataforma em beta. Estamos sempre evoluindo. Seu feedback é essencial para moldarmos o futuro.
          </p>
        </div>
      </div>
    </footer>
  );
}
