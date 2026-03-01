import { Logo } from '@/components/ui';

export function FooterSection() {
  return (
    <footer className="border-t border-ceramic-text-secondary/10 bg-ceramic-cool mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Col 1: Logo + Tagline */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <div className="flex items-center gap-3">
              <Logo variant="default" width={32} />
              <span className="font-black text-xl text-ceramic-text-primary tracking-tighter">
                Aica Life OS
              </span>
            </div>
            <p className="text-sm text-ceramic-text-secondary font-medium">
              Transforme o caos em clareza
            </p>
          </div>

          {/* Col 2: Plataforma */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-1">
              Plataforma
            </h4>
            <a
              href="/status"
              className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors font-medium"
            >
              Status dos Serviços
            </a>
          </div>

          {/* Col 3: Legal */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-1">
              Legal
            </h4>
            <a
              href="/privacy-policy"
              className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors font-medium"
            >
              Privacidade
            </a>
            <a
              href="/terms"
              className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors font-medium"
            >
              Termos
            </a>
          </div>

          {/* Col 4: Contato */}
          <div className="flex flex-col items-center sm:items-start md:items-end gap-3">
            <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-1">
              Contato
            </h4>
            <a
              href="mailto:contato@aica.guru"
              className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors font-medium"
            >
              contato@aica.guru
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-ceramic-text-secondary/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-center text-xs text-ceramic-text-secondary/60">
            &copy; {new Date().getFullYear()} Aica. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
