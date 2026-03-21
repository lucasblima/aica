import path, { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        }
      },
      // Security headers middleware
      headers: {
        // Content Security Policy - defense against XSS attacks
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://withcallout.com", // unsafe-inline/eval needed for React dev tools and HMR
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // unsafe-inline needed for styled components
          "img-src 'self' data: https: blob:", // Allow images from data URIs, HTTPS, and blob URLs
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https://ai.google.dev https://*.supabase.co wss://*.supabase.co https://n8n-n8n.w9jo16.easypanel.host https://project-management-docker.w9jo16.easypanel.host https://www.googleapis.com https://*.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://*.googleusercontent.com wss://generativelanguage.googleapis.com https://generativelanguage.googleapis.com https://withcallout.com https://*.withcallout.com",
          "media-src 'self' blob: data:",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          // upgrade-insecure-requests omitted — breaks HTTP localhost in dev
        ].join('; '),
        // Prevent clickjacking attacks
        'X-Frame-Options': 'DENY',
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Enable XSS protection in older browsers
        'X-XSS-Protection': '1; mode=block',
        // Referrer policy for privacy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permissions policy (formerly Feature Policy)
        'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(self)',
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'AICA Life OS',
          short_name: 'AICA',
          description: 'Sistema Operacional de Vida Integral',
          theme_color: '#D4AF37',
          background_color: '#F5F0EB',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              files: [
                {
                  name: 'shared_files',
                  accept: ['text/plain', '.txt', 'application/zip', '.zip'],
                },
              ],
            },
          },
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Exclude unhashed files from precache manifest to prevent stale entries
          globIgnores: ['**/sw-share-target.js'],
          skipWaiting: false,
          clientsClaim: false,
          cleanupOutdatedCaches: true,
          // Vite hashed chunks already have unique filenames — skip cache-busting query params
          dontCacheBustURLsMatching: /[-.][\da-f]{7,8}\./,
          // Prevent Workbox navigation fallback from intercepting these paths
          navigateFallbackDenylist: [/^\/assets\//, /^\/api\//, /^\/auth\//],
          importScripts: ['/sw-share-target.js'],
          // No runtimeCaching for Supabase — auth requests must NEVER go through
          // the service worker cache. When CacheStorage is broken (browser storage
          // corruption), intercepting these requests blocks login entirely.
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    // Otimizacao de dependencias para evitar problemas de bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        'scheduler',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities'
      ]
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id) {
            // Vendor chunks - bibliotecas de terceiros
            if (id.includes('node_modules')) {
              // React ecosystem - inclui scheduler e react-router para evitar dependencia circular
              // O scheduler e uma dependencia interna do react-dom e deve estar no mesmo chunk
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('scheduler')
              ) {
                return 'vendor-react';
              }
              // Framer Motion e suas dependencias internas
              // motion-dom e motion-utils sao dependencias do framer-motion
              if (
                id.includes('framer-motion') ||
                id.includes('motion-dom') ||
                id.includes('motion-utils')
              ) {
                return 'vendor-motion';
              }
              // DnD Kit
              if (id.includes('@dnd-kit')) {
                return 'vendor-dnd';
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // Lucide icons - biblioteca grande de icones
              if (id.includes('lucide-react') || id.includes('lucide')) {
                return 'vendor-icons';
              }
              // Heroicons
              if (id.includes('@heroicons')) {
                return 'vendor-heroicons';
              }
              // Google Generative AI
              if (id.includes('@google/genai')) {
                return 'vendor-google';
              }
              // TanStack (React Query e React Virtual)
              if (id.includes('@tanstack')) {
                return 'vendor-tanstack';
              }
              // Date utilities
              if (id.includes('date-fns') || id.includes('dayjs')) {
                return 'vendor-date';
              }
              // PDF processing - biblioteca pesada
              if (id.includes('pdfjs-dist') || id.includes('pdf.js')) {
                return 'vendor-pdf';
              }
              // Document processing (mammoth for DOCX)
              if (id.includes('mammoth')) {
                return 'vendor-docs';
              }
              // Canvas confetti (animations)
              if (id.includes('canvas-confetti')) {
                return 'vendor-confetti';
              }
              // Outras bibliotecas de terceiros - agora muito menor
              return 'vendor-libs';
            }

            // Module chunks - modulos da aplicacao
            if (id.includes('src/modules/podcast')) {
              return 'module-podcast';
            }
            if (id.includes('src/modules/finance')) {
              return 'module-finance';
            }
            if (id.includes('src/modules/grants')) {
              return 'module-grants';
            }
            if (id.includes('src/modules/journey')) {
              return 'module-journey';
            }
            if (id.includes('src/modules/connections')) {
              return 'module-connections';
            }
            if (id.includes('src/modules/onboarding')) {
              return 'module-onboarding';
            }

            // Services chunk - includes src/services and src/lib for shared utilities
            if (id.includes('src/services')) {
              return 'services';
            }

            // Lib chunk - shared utilities that should load before modules
            // This prevents circular dependencies between services and modules
            if (id.includes('src/lib/')) {
              return 'services';
            }
          }
        }
      },
      // Limite de warning para chunks grandes (500KB target)
      chunkSizeWarningLimit: 500,
      // Usar esbuild para minificacao (mais rapido que terser)
      minify: 'esbuild',
      // Remover console.log em producao
      target: 'esnext',
      sourcemap: false
    }
  };
});
