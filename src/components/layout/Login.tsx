import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../ui';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { springHover, springPress } from '@/lib/animations/ceramic-motion';
import { Turnstile } from '@marsidev/react-turnstile';

interface LoginProps {
  onLogin: () => void;
  /** Variant controls the layout mode:
   * - 'full-page': Full screen with background (default, original behavior)
   * - 'sheet': Compact version for modal/sheet usage without background
   */
  variant?: 'full-page' | 'sheet';
}

export default function Login({ onLogin, variant = 'full-page' }: LoginProps) {
  const { login, error, loading } = useGoogleAuth();
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  const handleGoogleLogin = async () => {
    await login();
    // Note: onLogin will be called after OAuth redirect completes
  };

  const isSheet = variant === 'sheet';

  // Sheet variant: clean, no background, no shadows on container
  if (isSheet) {
    return (
      <div className="py-4">
        {/* Logo/Header - Compact for sheet with entrance animation */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div
            className="inline-flex items-center justify-center bg-ceramic-base rounded-2xl mb-4 overflow-hidden ceramic-shadow"
            whileHover={{ scale: 1.05 }}
            transition={springHover}
          >
            <Logo variant="default" width={64} className="rounded-2xl" />
          </motion.div>
          <h1 className="text-xl font-black text-ceramic-text-primary text-etched mb-1">
            Aica Life OS
          </h1>
          <p className="text-sm text-ceramic-text-secondary">
            Sistema operacional para sua vida
          </p>
        </motion.div>

        {/* Error Message with animation */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-6 p-4 bg-ceramic-base rounded-xl text-ceramic-text-primary text-sm text-center ceramic-inset-shallow"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google Login Button with enhanced interactions */}
        <motion.button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-ceramic-base text-ceramic-text-primary py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:cursor-not-allowed ceramic-shadow overflow-hidden relative"
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          transition={springPress}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ transitionProperty: 'box-shadow' }}
          data-testid="google-login-button"
        >
          {/* Button content with loading state */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <LoadingSpinner />
                <span>Conectando...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <GoogleIcon />
                <span>Entrar com Google</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Footer note with fade in */}
        <motion.p
          className="text-xs text-ceramic-text-secondary text-center mt-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          Ao continuar, você concorda com nossos<br />
          termos de serviço e política de privacidade
        </motion.p>
      </div>
    );
  }

  // Full-page variant: original layout with background
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F0EFE9] relative overflow-hidden">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-[#5C554B] to-transparent pointer-events-none" />

      {/* Login Card - Ceramic Floating Block */}
      <motion.div
        className="bg-[#F0EFE9] p-10 w-full max-w-md relative z-10 rounded-[40px]"
        style={{ boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff' }}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo/Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center justify-center bg-[#F0EFE9] rounded-2xl mb-6 overflow-hidden"
            style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
            whileHover={{ scale: 1.05 }}
            transition={springHover}
          >
            <Logo variant="default" width={80} className="rounded-2xl" />
          </motion.div>
          <h1 className="text-2xl font-black text-ceramic-text-primary text-etched mb-2">
            Aica Life OS
          </h1>
          <p className="text-sm text-[#948D82]">
            Sistema operacional para sua vida
          </p>
        </motion.div>

        {/* Error Message with animation */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-6 p-4 bg-[#EBE9E4] rounded-xl text-[#5C554B] text-sm text-center"
              style={{ boxShadow: 'inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff' }}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cloudflare Turnstile — invisible CAPTCHA */}
        <div className="mb-4 flex justify-center">
          <Turnstile
            siteKey={turnstileSiteKey}
            options={{ theme: 'light', size: 'invisible' }}
          />
        </div>

        {/* Google Login Button */}
        <motion.button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-[#F0EFE9] text-[#5C554B] py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:cursor-not-allowed overflow-hidden relative"
          style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98, boxShadow: 'inset 4px 4px 8px #c5c5c5, inset -4px -4px 8px #ffffff' } : {}}
          transition={springPress}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Button content with loading state */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <LoadingSpinner />
                <span>Conectando...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <GoogleIcon />
                <span>Entrar com Google</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Subtle footer note */}
        <motion.p
          className="text-xs text-[#948D82] text-center mt-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          Ao continuar, você concorda com nossos<br />
          termos de serviço e política de privacidade
        </motion.p>
      </motion.div>
    </div>
  );
}

/** Animated loading spinner - ceramic style */
function LoadingSpinner() {
  return (
    <motion.div
      className="w-6 h-6 rounded-full border-2 border-ceramic-text-secondary/30 border-t-ceramic-text-primary"
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

/** Google "G" icon component */
function GoogleIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
