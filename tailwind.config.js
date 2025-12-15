/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                'aurora-blue': '#6366f1',
                'aurora-purple': '#a855f7',
                'aurora-teal': '#14b8a6',
                'ceramic-base': '#F0EFE9',
                'ceramic-text-primary': '#5C554B',
                'ceramic-text-secondary': '#948D82',
                'ceramic-accent': '#D97706', // Glazed Amber
                'ceramic-accent-dark': '#B45309',  // Accessible amber - WCAG AA compliant with white text
                'ceramic-highlight': '#E6D5C3',
                'ceramic-positive': '#6B7B5C',  // Sage moss - para valores positivos
                'ceramic-negative': '#9B4D3A',  // Terracotta queimado - para valores negativos
                'ceramic-neutral': '#8B8579',   // Taupe médio - para valores neutros

                // Ceramic Temperature Colors (frio -> quente)
                'ceramic-cool': '#E8EBE9',      // Tom frio para repouso/inativo
                'ceramic-cool-hover': '#DDE0DE', // Hover no estado frio
                'ceramic-warm': '#F5E6D3',      // Tom quente para seleção/ativo
                'ceramic-warm-hover': '#EFD9C0', // Hover no estado quente
                'ceramic-warm-active': '#E8CEB0', // Estado ativo intensificado
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                'float': 'float 8s ease-in-out infinite',
                'pulse-slow': 'pulseSlow 3s infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-15px)' },
                },
                pulseSlow: {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.9', transform: 'scale(0.95)' },
                }
            },
            boxShadow: {
                'ceramic-inset': 'inset 3px 3px 6px rgba(163, 158, 145, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 1.0)',
                'ceramic-elevated': '6px 6px 12px rgba(163, 158, 145, 0.35), -6px -6px 12px rgba(255, 255, 255, 1.0)',
            }
        }
    },
    plugins: [],
}
