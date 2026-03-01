import type { LucideIcon } from 'lucide-react';

interface ModuleTabProps {
  icon: LucideIcon;
  name: string;
  isActive: boolean;
  onClick: () => void;
}

export function ModuleTab({ icon: Icon, name, isActive, onClick }: ModuleTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors ${
        isActive
          ? 'bg-amber-50 border-l-4 border-amber-500 text-ceramic-text-primary font-medium'
          : 'text-ceramic-text-secondary hover:bg-ceramic-cool/50 border-l-4 border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-500' : ''}`} />
      <span className="text-sm">{name}</span>
    </button>
  );
}
