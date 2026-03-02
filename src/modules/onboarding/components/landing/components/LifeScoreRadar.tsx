import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';

interface DomainData {
  id: string;
  label: string;
  demoScore: number;
}

interface LifeScoreRadarProps {
  domains: DomainData[];
  isVisible: boolean;
}

// ── SVG geometry constants ──
const SIZE = 500;
const CENTER = SIZE / 2;
const RADIUS = 180;
const RINGS = [0.25, 0.5, 0.75, 1.0];
const LABEL_OFFSET = 28;

/**
 * Calculate the (x, y) position for a vertex on the radar polygon.
 * Angle starts from top (-PI/2) and goes clockwise.
 */
function polarToCartesian(index: number, total: number, value: number): { x: number; y: number } {
  const angle = (index * (2 * Math.PI)) / total - Math.PI / 2;
  return {
    x: CENTER + RADIUS * value * Math.cos(angle),
    y: CENTER + RADIUS * value * Math.sin(angle),
  };
}

/**
 * Build an SVG polygon points string from an array of domain scores,
 * multiplied by a progress factor (0 to 1).
 */
function buildPolygonPoints(domains: DomainData[], progress: number): string {
  return domains
    .map((d, i) => {
      const { x, y } = polarToCartesian(i, domains.length, d.demoScore * progress);
      return `${x},${y}`;
    })
    .join(' ');
}

/** Animated count-up number displayed at the radar center. */
function AnimatedScore({ target, isVisible }: { target: number; isVisible: boolean }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(2));
  const [displayText, setDisplayText] = useState('0.00');

  useEffect(() => {
    if (isVisible) {
      motionVal.set(target);
    } else {
      motionVal.set(0);
    }
  }, [isVisible, target, motionVal]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayText(v));
    return unsubscribe;
  }, [display]);

  return <>{displayText}</>;
}

/** Single vertex dot with pulsing animation. */
function VertexDot({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.circle
      cx={x}
      cy={y}
      r={5}
      fill="#D97706"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [1, 1.3, 1],
        opacity: 1,
      }}
      transition={{
        scale: {
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut',
          delay,
        },
        opacity: {
          duration: 0.3,
          delay: delay * 0.5,
        },
      }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    />
  );
}

/**
 * LifeScoreRadar -- SVG-based animated radar chart showing 7 life domains.
 *
 * When `isVisible` flips to true, the polygon vertices interpolate from the
 * center outward to their demo score values using a spring animation.
 */
export function LifeScoreRadar({ domains, isVisible }: LifeScoreRadarProps) {
  const count = domains.length;
  const [progress, setProgress] = useState(0);
  const progressMotion = useMotionValue(0);
  const progressSpring = useSpring(progressMotion, {
    stiffness: 50,
    damping: 18,
    mass: 1,
  });

  // Subscribe to the spring to update polygon points
  useEffect(() => {
    const unsubscribe = progressSpring.on('change', (v) => setProgress(v));
    return unsubscribe;
  }, [progressSpring]);

  // Trigger animation when isVisible becomes true
  useEffect(() => {
    if (isVisible) {
      progressMotion.set(1);
    } else {
      progressMotion.set(0);
    }
  }, [isVisible, progressMotion]);

  // Pre-compute vertex positions at full progress (for dots and labels)
  const vertexPositions = domains.map((d, i) => polarToCartesian(i, count, d.demoScore));
  const labelPositions = domains.map((_, i) => {
    const angle = (i * (2 * Math.PI)) / count - Math.PI / 2;
    return {
      x: CENTER + (RADIUS + LABEL_OFFSET) * Math.cos(angle),
      y: CENTER + (RADIUS + LABEL_OFFSET) * Math.sin(angle),
    };
  });

  const polygonPoints = buildPolygonPoints(domains, progress);

  return (
    <div className="w-full max-w-[280px] sm:max-w-[400px] mx-auto">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-auto"
        role="img"
        aria-label="Life Score Radar Chart showing 7 life domains"
      >
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.10" />
          </radialGradient>
        </defs>

        {/* ── Concentric rings ── */}
        {RINGS.map((ringVal) => (
          <polygon
            key={ringVal}
            points={Array.from({ length: count })
              .map((_, i) => {
                const { x, y } = polarToCartesian(i, count, ringVal);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#D4CFC7"
            strokeWidth={ringVal === 1.0 ? 1.5 : 0.8}
            opacity={0.5}
          />
        ))}

        {/* ── Axis lines from center to each vertex ── */}
        {Array.from({ length: count }).map((_, i) => {
          const { x, y } = polarToCartesian(i, count, 1);
          return (
            <line
              key={`axis-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="#D4CFC7"
              strokeWidth={0.8}
              opacity={0.4}
            />
          );
        })}

        {/* ── Filled polygon (animated) ── */}
        <motion.polygon
          points={polygonPoints}
          fill="url(#radarFill)"
          stroke="#D97706"
          strokeWidth={2.5}
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        {/* ── Vertex dots (animated pulse) ── */}
        {isVisible &&
          vertexPositions.map((pos, i) => {
            // Interpolate dot position based on progress
            const dotX = CENTER + (pos.x - CENTER) * progress;
            const dotY = CENTER + (pos.y - CENTER) * progress;
            return (
              <VertexDot
                key={domains[i].id}
                x={dotX}
                y={dotY}
                delay={i * 0.2}
              />
            );
          })}

        {/* ── Vertex labels ── */}
        {labelPositions.map((pos, i) => {
          // Determine text-anchor based on position relative to center
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (pos.x < CENTER - 10) textAnchor = 'end';
          if (pos.x > CENTER + 10) textAnchor = 'start';

          // Vertical offset adjustment
          let dy = '0.35em';
          if (pos.y < CENTER - RADIUS * 0.5) dy = '0.8em';
          if (pos.y > CENTER + RADIUS * 0.5) dy = '0em';

          return (
            <motion.text
              key={`label-${domains[i].id}`}
              x={pos.x}
              y={pos.y}
              textAnchor={textAnchor}
              dy={dy}
              className="fill-ceramic-text-primary"
              fontSize={13}
              fontWeight={600}
              initial={{ opacity: 0 }}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
            >
              {domains[i].label}
            </motion.text>
          );
        })}

        {/* ── Center label + animated score ── */}
        <motion.text
          x={CENTER}
          y={CENTER - 14}
          textAnchor="middle"
          className="fill-ceramic-text-secondary"
          fontSize={13}
          fontWeight={500}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          Life Score
        </motion.text>
        <motion.text
          x={CENTER}
          y={CENTER + 16}
          textAnchor="middle"
          className="fill-ceramic-text-primary"
          fontSize={32}
          fontWeight={800}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <AnimatedScore target={0.72} isVisible={isVisible} />
        </motion.text>
      </svg>
    </div>
  );
}
