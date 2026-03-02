import { motion } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';

/**
 * SpiralDetectionVisual -- Small SVG + text visualization
 * showing how AICA detects negative spirals across domains.
 *
 * Displays 3 interconnected circles (Bem-estar, Produtividade, Financas)
 * with animated dashed connections representing cross-domain correlations.
 */
export function SpiralDetectionVisual() {
  const { ref, isInView } = useScrollReveal();

  // Triangle positions for the 3 example domains
  const circles = [
    { cx: 100, cy: 25, label: 'Bem-estar' },
    { cx: 40, cy: 95, label: 'Produtividade' },
    { cx: 160, cy: 95, label: 'Financas' },
  ];

  // Connection lines between circles
  const lines = [
    { x1: circles[0].cx, y1: circles[0].cy, x2: circles[1].cx, y2: circles[1].cy },
    { x1: circles[1].cx, y1: circles[1].cy, x2: circles[2].cx, y2: circles[2].cy },
    { x1: circles[2].cx, y1: circles[2].cy, x2: circles[0].cx, y2: circles[0].cy },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-ceramic-error-bg rounded-2xl p-6 border border-ceramic-error/20 max-w-2xl mx-auto mt-12"
    >
      <h3 className="font-bold text-ceramic-text-primary text-lg">
        Deteccao de Espiral Negativa
      </h3>

      {/* SVG visualization */}
      <div className="flex justify-center mt-4">
        <svg
          viewBox="0 0 200 120"
          className="w-full max-w-[200px] h-auto overflow-visible"
        >
          {/* Animated dashed connection lines */}
          {lines.map((line, i) => (
            <motion.line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="currentColor"
              className="text-ceramic-error"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              initial={{ strokeDashoffset: 0 }}
              animate={isInView ? { strokeDashoffset: [0, -20] } : { strokeDashoffset: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.3,
              }}
            />
          ))}

          {/* Domain circles */}
          {circles.map((c, i) => (
            <g key={i}>
              <motion.circle
                cx={c.cx}
                cy={c.cy}
                r={20}
                fill="currentColor"
                className="text-ceramic-error/20"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: 'inherit' }}
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
              />
              {/* Use explicit fill colors since className inheritance is tricky in SVG */}
              <circle
                cx={c.cx}
                cy={c.cy}
                r={20}
                fill="rgba(220, 38, 38, 0.1)"
                stroke="rgba(220, 38, 38, 0.6)"
                strokeWidth="1.5"
              />
              <text
                x={c.cx}
                y={c.cy + 32}
                textAnchor="middle"
                className="fill-ceramic-text-secondary"
                fontSize="8"
              >
                {c.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="text-sm text-ceramic-text-secondary mt-4">
        Quando 3+ areas caem ao mesmo tempo, o AICA detecta o padrao e alerta
        voce antes que vire crise.
      </p>
    </motion.div>
  );
}
