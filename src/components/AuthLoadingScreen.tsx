import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * AuthLoadingScreen Component
 *
 * Displayed while the app checks for an active authentication session.
 * Uses the ceramic design system for consistency with the rest of the app.
 */
export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-ceramic-base relative overflow-hidden">
      {/* Subtle texture overlay - consistent with Login.tsx */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-ceramic-text-primary to-transparent pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        {/* Logo container with ceramic effect */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
        >
          <div
            className="inline-flex items-center justify-center w-20 h-20 bg-ceramic-base rounded-2xl mb-6"
            style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
          >
            <Sparkles className="w-10 h-10 text-ceramic-text-primary" />
          </div>
        </motion.div>

        {/* Loading text */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.2,
            ease: 'easeOut',
          }}
        >
          <h2 className="text-xl font-black text-ceramic-text-primary text-etched">
            Aica Life OS
          </h2>
          <p className="text-sm text-ceramic-text-secondary font-medium">
            Verificando autenticação...
          </p>
        </motion.div>

        {/* Animated loading indicator */}
        <motion.div
          className="flex items-center gap-2 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-ceramic-text-secondary"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>

        {/* Decorative circles - subtle background animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #5C554B 0%, transparent 70%)' }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.08, 0.05],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #948D82 0%, transparent 70%)' }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.03, 0.06, 0.03],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;
