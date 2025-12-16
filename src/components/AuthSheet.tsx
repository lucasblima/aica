import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import Login from './Login';

interface AuthSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Spring configuration for iOS-like sheet behavior
const sheetSpring = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 300,
  mass: 0.8,
};

// Threshold for drag-to-dismiss (in pixels)
const DISMISS_THRESHOLD = 100;
// Velocity threshold for quick swipe dismiss
const VELOCITY_THRESHOLD = 500;

/**
 * AuthSheet - iOS-style bottom sheet for authentication
 *
 * Features:
 * - Slide-up animation from bottom
 * - Backdrop with ceramic blur
 * - Drag handle for dismissal
 * - Swipe down to close
 * - Keyboard-accessible (Escape to close)
 */
export function AuthSheet({ isOpen, onClose, onSuccess }: AuthSheetProps) {
  const controls = useAnimation();

  // Handle keyboard escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle drag end - dismiss if dragged far enough or with enough velocity
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldDismiss =
        info.offset.y > DISMISS_THRESHOLD || info.velocity.y > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        onClose();
      } else {
        // Snap back to original position
        controls.start({ y: 0 });
      }
    },
    [onClose, controls]
  );

  // Handle successful login
  const handleLoginSuccess = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with ceramic blur */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: 'rgba(240, 239, 233, 0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet container */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
            style={{ maxHeight: '85vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-sheet-title"
          >
            {/* Sheet with ceramic styling */}
            <div
              className="bg-ceramic-base rounded-t-[32px] overflow-hidden flex flex-col"
              style={{
                boxShadow: '0 -8px 32px rgba(163, 158, 145, 0.25)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <motion.div
                  className="w-10 h-1 rounded-full"
                  style={{ backgroundColor: 'rgba(148, 141, 130, 0.4)' }}
                  whileHover={{ scaleX: 1.2, backgroundColor: 'rgba(148, 141, 130, 0.6)' }}
                  transition={{ duration: 0.15 }}
                />
              </div>

              {/* Content area with padding for safe area */}
              <div className="px-6 pb-8 overflow-y-auto" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                {/* Hidden title for accessibility */}
                <h2 id="auth-sheet-title" className="sr-only">
                  Autenticação
                </h2>

                {/* Login component in sheet variant */}
                <Login variant="sheet" onLogin={handleLoginSuccess} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AuthSheet;
