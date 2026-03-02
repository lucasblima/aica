import { motion } from 'framer-motion';

interface ChatDemoContextProps {
  icon: string;
  label: string;
  modules: string[];
  details: { label: string; value: string }[];
}

export function ChatDemoContext({ icon, label, modules, details }: ChatDemoContextProps) {
  return (
    <motion.div
      className="ml-4 mt-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="bg-white/60 border border-ceramic-border/40 rounded-xl p-3 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
            {label}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {modules.map((mod) => (
              <span
                key={mod}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0">
              <p className="text-[10px] text-ceramic-text-secondary truncate">{detail.label}</p>
              <p className="text-xs font-medium text-ceramic-text-primary truncate">{detail.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
