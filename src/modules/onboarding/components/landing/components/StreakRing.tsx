import { motion } from 'framer-motion';

interface StreakRingProps {
  current: number;
  total: number;
  isVisible: boolean;
}

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Grace period dot indicator. */
function GraceDot({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <motion.div
      className={`w-4 h-4 rounded-full ${
        filled ? 'bg-ceramic-accent' : 'border-2 border-ceramic-accent'
      }`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15, delay }}
    />
  );
}

/**
 * StreakRing -- SVG circular progress ring showing a compassionate streak.
 *
 * Draws a background track and an animated progress arc that fills when
 * `isVisible` becomes true (typically triggered by useScrollReveal).
 * Below the ring, 4 grace-period dots pop in sequentially.
 */
export function StreakRing({ current, total, isVisible }: StreakRingProps) {
  const progress = Math.min(current / total, 1);
  const targetOffset = CIRCUMFERENCE * (1 - progress);

  // Grace period dots: 3 used (filled), 1 remaining (empty)
  const gracePeriods = [true, true, true, false];
  // Delay base: ring draws in 1.5s, dots start after
  const dotBaseDelay = 1.8;

  return (
    <div className="flex flex-col items-center">
      {/* SVG ring */}
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200" viewBox="0 0 200 200" className="block">
          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            stroke="#DDD8CF"
            strokeWidth={8}
            fill="none"
          />

          {/* Progress arc */}
          <motion.circle
            cx="100"
            cy="100"
            r={RADIUS}
            stroke="#D97706"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={
              isVisible
                ? { strokeDashoffset: targetOffset }
                : { strokeDashoffset: CIRCUMFERENCE }
            }
            transition={{ duration: 1.5, ease: 'easeOut' }}
            transform="rotate(-90 100 100)"
          />
        </svg>

        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-black text-3xl text-ceramic-text-primary leading-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {current}/{total}
          </motion.span>
          <motion.span
            className="text-sm text-ceramic-text-secondary mt-1"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            dias
          </motion.span>
        </div>
      </div>

      {/* Grace period indicators */}
      <div className="flex flex-col items-center mt-4">
        <div className="flex gap-2">
          {gracePeriods.map((filled, i) => (
            <GraceDot
              key={i}
              filled={filled}
              delay={isVisible ? dotBaseDelay + i * 0.2 : 0}
            />
          ))}
        </div>
        <motion.span
          className="text-xs text-ceramic-text-secondary mt-1"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: dotBaseDelay + 0.8 }}
        >
          grace periods
        </motion.span>
      </div>
    </div>
  );
}
