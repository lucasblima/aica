import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { CheckCircle, TrendingUp, Flame, Calendar, Lightbulb } from 'lucide-react';
import { heroDashboard } from '../data/demoData';

// ── AnimatedCounter ────────────────────────────────────────────────
interface AnimatedCounterProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  trigger: boolean;
}

function AnimatedCounter({
  target,
  duration = 2000,
  prefix = '',
  suffix = '',
  trigger,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;

    let startTime: number | null = null;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [trigger, target, duration]);

  const formatted = target >= 1000
    ? value.toLocaleString('pt-BR')
    : String(value);

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ── HeroDashboardDemo ──────────────────────────────────────────────
export function HeroDashboardDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const stats = [
    {
      label: 'Tarefas hoje',
      value: heroDashboard.tasksToday,
      icon: CheckCircle,
      colorClass: 'text-ceramic-success',
    },
    {
      label: 'Saldo',
      value: heroDashboard.balance,
      icon: TrendingUp,
      colorClass: 'text-ceramic-info',
      prefix: 'R$ ',
    },
    {
      label: 'Streak',
      value: heroDashboard.streakDays,
      icon: Flame,
      colorClass: 'text-amber-500',
      suffix: ' dias',
    },
  ];

  return (
    <div
      ref={ref}
      className="bg-ceramic-base rounded-[2rem] shadow-ceramic-emboss p-6 md:p-8 border border-ceramic-border/50 w-full"
    >
      {/* Amber gradient top stripe */}
      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mb-6" />

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className="bg-ceramic-cool/50 rounded-xl p-3 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${stat.colorClass}`} />
              <div className="text-xl font-bold text-ceramic-text-primary leading-tight">
                <AnimatedCounter
                  target={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  trigger={isInView}
                />
              </div>
              <div className="text-xs text-ceramic-text-secondary mt-0.5">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Next event card */}
      <motion.div
        className="bg-ceramic-cool/30 rounded-xl p-3 flex items-center gap-3 mb-3"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
      >
        <Calendar className="w-5 h-5 text-ceramic-info flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ceramic-text-primary truncate">
            {heroDashboard.nextEvent.title}
          </div>
          <div className="text-xs text-ceramic-text-secondary">
            Hoje, {heroDashboard.nextEvent.time}
          </div>
        </div>
      </motion.div>

      {/* Insight card */}
      <motion.div
        className="bg-amber-50/50 rounded-xl p-3 flex items-start gap-3"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.9, ease: 'easeOut' }}
      >
        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs italic text-ceramic-text-secondary leading-relaxed">
          {heroDashboard.insight}
        </p>
      </motion.div>
    </div>
  );
}
