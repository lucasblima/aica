import { Shield, Lock, EyeOff } from 'lucide-react';

const badges = [
  { icon: Shield, label: 'LGPD Compliant' },
  { icon: Lock, label: 'Dados criptografados' },
  { icon: EyeOff, label: 'Sem acesso a senhas' },
] as const;

export function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-6 mt-8">
      {badges.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-ceramic-text-secondary text-sm">
          <Icon size={16} className="opacity-60" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
