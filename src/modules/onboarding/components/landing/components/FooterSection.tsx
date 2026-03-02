import { Logo } from '@/components/ui';

export function FooterSection() {
  return (
    <footer className="border-t border-ceramic-border bg-ceramic-cool">
      <div className="max-w-5xl mx-auto py-8 px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <Logo variant="default" width={28} />
            <span className="font-black text-lg text-ceramic-text-primary tracking-tight">
              AICA Life OS
            </span>
          </div>

          {/* Center: Links */}
          <nav className="flex items-center gap-4 text-sm font-medium text-ceramic-text-secondary">
            <a
              href="/privacy-policy"
              className="hover:text-ceramic-text-primary transition-colors"
            >
              Privacidade
            </a>
            <span className="text-ceramic-border">|</span>
            <a
              href="/terms"
              className="hover:text-ceramic-text-primary transition-colors"
            >
              Termos
            </a>
            <span className="text-ceramic-border">|</span>
            <a
              href="mailto:contato@aica.guru"
              className="hover:text-ceramic-text-primary transition-colors"
            >
              Contato
            </a>
          </nav>

          {/* Right: Tagline */}
          <p className="text-sm text-ceramic-text-secondary italic">
            Feito com ceramica digital
          </p>
        </div>

        {/* Copyright */}
        <p className="text-xs text-ceramic-text-secondary/60 text-center mt-4">
          &copy; 2026 AICA Life OS
        </p>
      </div>
    </footer>
  );
}
