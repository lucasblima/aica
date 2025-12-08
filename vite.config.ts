import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
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
              // React ecosystem - inclui scheduler para evitar dependencia circular
              // O scheduler e uma dependencia interna do react-dom e deve estar no mesmo chunk
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
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
              // Lucide (icones)
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Google Generative AI
              if (
                id.includes('@google/genai') ||
                id.includes('@google/generative-ai')
              ) {
                return 'vendor-google';
              }
              // Outras bibliotecas de terceiros
              return 'vendor-other';
            }

            // Module chunks - modulos da aplicacao
            if (id.includes('src/modules/podcast')) {
              return 'module-podcast';
            }
            if (id.includes('src/modules/finance')) {
              return 'module-finance';
            }

            // Services chunk
            if (id.includes('src/services')) {
              return 'services';
            }
          }
        }
      },
      // Aumentar o limite de warning para chunks grandes
      chunkSizeWarningLimit: 600,
      // Usar esbuild para minificacao (mais rapido que terser)
      minify: 'esbuild',
      // Remover console.log em producao
      target: 'esnext',
      sourcemap: false
    }
  };
});
