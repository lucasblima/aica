import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
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
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Expose VITE_GEMINI_API_KEY to import.meta.env
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    },
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
              if (
                id.includes('@google/genai') ||
                id.includes('@google/generative-ai')
              ) {
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
              // Axios HTTP client
              if (id.includes('axios')) {
                return 'vendor-http';
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

            // Services chunk
            if (id.includes('src/services')) {
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
