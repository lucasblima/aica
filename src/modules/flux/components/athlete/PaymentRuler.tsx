/**
 * PaymentRuler — Visual notification ruler for athlete payment reminders
 *
 * Shows a horizontal timeline with markers at -7, -3, -1, 0, +1, +3, +7 days
 * relative to the payment due date. Highlights current position based on
 * today's date vs due date. Pure UI component — no actual notification sending.
 *
 * Issue #463
 */

import React from 'react';

/** Reminder markers relative to due date (negative = before, positive = after) */
const RULER_MARKERS = [-7, -3, -1, 0, 1, 3, 7] as const;

/** Labels for each marker */
const MARKER_LABELS: Record<number, string> = {
  [-7]: '7 dias antes',
  [-3]: '3 dias antes',
  [-1]: 'Véspera',
  [0]: 'Vencimento',
  [1]: '1 dia após',
  [3]: '3 dias após',
  [7]: '7 dias após',
};

/** Short labels for compact display */
const MARKER_SHORT: Record<number, string> = {
  [-7]: '-7d',
  [-3]: '-3d',
  [-1]: '-1d',
  [0]: 'Hoje',
  [1]: '+1d',
  [3]: '+3d',
  [7]: '+7d',
};

interface PaymentRulerProps {
  /** Day of month when payment is due (1-31) */
  dueDay: number;
  /** Current payment status */
  paymentStatus: 'paid' | 'pending' | 'overdue';
}

/**
 * Compute days until due date in current month.
 * Returns negative if past due, positive if before due, 0 if today.
 */
function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Clamp dueDay to the last day of current month
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const effectiveDueDay = Math.min(dueDay, lastDayOfMonth);

  const dueDate = new Date(currentYear, currentMonth, effectiveDueDay);
  dueDate.setHours(0, 0, 0, 0);

  const todayNorm = new Date(currentYear, currentMonth, today.getDate());
  todayNorm.setHours(0, 0, 0, 0);

  const diffMs = dueDate.getTime() - todayNorm.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the position index (0-based) where the current day falls on the ruler.
 * Returns a fractional index for interpolation between markers.
 */
function getCurrentPosition(daysUntilDue: number): number {
  // daysUntilDue is positive when due date is in the future,
  // so the "relative day" = -daysUntilDue (e.g., 7 days until due = marker -7)
  const relativeDay = -daysUntilDue;

  // Clamp to ruler range
  if (relativeDay <= RULER_MARKERS[0]) return 0;
  if (relativeDay >= RULER_MARKERS[RULER_MARKERS.length - 1]) return RULER_MARKERS.length - 1;

  // Find the two markers we're between
  for (let i = 0; i < RULER_MARKERS.length - 1; i++) {
    const left = RULER_MARKERS[i];
    const right = RULER_MARKERS[i + 1];
    if (relativeDay >= left && relativeDay <= right) {
      const t = (relativeDay - left) / (right - left);
      return i + t;
    }
  }

  return 0;
}

export function PaymentRuler({ dueDay, paymentStatus }: PaymentRulerProps) {
  const daysUntilDue = getDaysUntilDue(dueDay);
  const position = getCurrentPosition(daysUntilDue);
  const positionPercent = (position / (RULER_MARKERS.length - 1)) * 100;

  // Determine colors based on status
  const statusColors = {
    paid: { dot: 'bg-ceramic-success', line: 'bg-ceramic-success/30', glow: 'shadow-ceramic-success/30' },
    pending: { dot: 'bg-ceramic-warning', line: 'bg-ceramic-warning/30', glow: 'shadow-ceramic-warning/30' },
    overdue: { dot: 'bg-ceramic-error', line: 'bg-ceramic-error/30', glow: 'shadow-ceramic-error/30' },
  };

  const colors = statusColors[paymentStatus];

  // Label for current position
  const currentLabel =
    daysUntilDue > 0
      ? `${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''} para vencer`
      : daysUntilDue < 0
        ? `${Math.abs(daysUntilDue)} dia${Math.abs(daysUntilDue) > 1 ? 's' : ''} em atraso`
        : 'Vence hoje';

  return (
    <div className="space-y-3">
      {/* Current position label */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
          Regua de Cobranca
        </p>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            paymentStatus === 'paid'
              ? 'bg-ceramic-success/10 text-ceramic-success'
              : paymentStatus === 'overdue'
                ? 'bg-ceramic-error/10 text-ceramic-error'
                : 'bg-ceramic-warning/10 text-ceramic-warning'
          }`}
        >
          {currentLabel}
        </span>
      </div>

      {/* Ruler */}
      <div className="relative px-3 pt-6 pb-2">
        {/* Background line */}
        <div className="absolute left-3 right-3 top-[34px] h-0.5 bg-ceramic-border rounded-full" />

        {/* Progress line (up to current position) */}
        <div
          className={`absolute left-3 top-[34px] h-0.5 ${colors.line} rounded-full transition-all duration-500`}
          style={{ width: `${positionPercent}%` }}
        />

        {/* Markers */}
        <div className="relative flex justify-between">
          {RULER_MARKERS.map((marker, idx) => {
            const isActive = idx <= Math.floor(position);
            const isCurrent = Math.abs(idx - position) < 0.5;
            const isPast = marker < 0;
            const isDueDay = marker === 0;

            return (
              <div
                key={marker}
                className="flex flex-col items-center"
                style={{ width: 0 }}
              >
                {/* Short label above */}
                <span
                  className={`text-[9px] font-bold mb-1 whitespace-nowrap ${
                    isCurrent
                      ? paymentStatus === 'paid'
                        ? 'text-ceramic-success'
                        : paymentStatus === 'overdue'
                          ? 'text-ceramic-error'
                          : 'text-ceramic-warning'
                      : isDueDay
                        ? 'text-ceramic-text-primary'
                        : 'text-ceramic-text-secondary'
                  }`}
                >
                  {MARKER_SHORT[marker]}
                </span>

                {/* Dot */}
                <div
                  className={`relative w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    isCurrent
                      ? `${colors.dot} border-transparent scale-150 shadow-lg ${colors.glow}`
                      : isDueDay
                        ? 'bg-ceramic-text-primary border-transparent scale-125'
                        : isActive
                          ? `${colors.dot} border-transparent opacity-60`
                          : 'bg-ceramic-base border-ceramic-border'
                  }`}
                >
                  {/* Pulse animation for current position */}
                  {isCurrent && paymentStatus !== 'paid' && (
                    <span
                      className={`absolute inset-0 rounded-full ${colors.dot} animate-ping opacity-30`}
                    />
                  )}
                </div>

                {/* Reminder type below (visible on hover via tooltip pattern) */}
                <span
                  className={`text-[8px] mt-1.5 whitespace-nowrap ${
                    isCurrent
                      ? 'text-ceramic-text-primary font-bold'
                      : 'text-ceramic-text-secondary/60'
                  }`}
                  title={MARKER_LABELS[marker]}
                >
                  {isPast ? 'Lembrete' : isDueDay ? 'Cobrar' : 'Aviso'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PaymentRuler;
