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
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunks - bibliotecas de terceiros
            if (id.includes('node_modules')) {
              // React e ReactDOM
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // Lucide (ícones)
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Google Generative AI
              if (id.includes('@google/generative-ai')) {
                return 'vendor-google';
              }
              // Outras bibliotecas de terceiros
              return 'vendor-other';
            }

            // Module chunks - módulos da aplicação
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
      // Usar esbuild para minificação (mais rápido que terser)
      minify: 'esbuild',
      // Remover console.log em produção
      target: 'esnext',
      sourcemap: false
    }
  };
});
