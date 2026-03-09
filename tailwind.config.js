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
                fredoka: ['Fredoka', 'Nunito', 'sans-serif'],
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

                // Ceramic Semantic Colors (Renaissance)
                'ceramic-info': '#7B8FA2',
                'ceramic-warning': '#C4883A',
                'ceramic-success': '#6B7B5C',
                'ceramic-error': '#9B4D3A',
                'ceramic-info-bg': '#F0F2F5',
                'ceramic-warning-bg': '#F8F0E5',
                'ceramic-success-bg': '#F0F3ED',
                'ceramic-error-bg': '#F5EFED',
                'ceramic-card': '#F0EFE9',
                'ceramic-border': '#DDD8CF',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                'float': 'float 8s ease-in-out infinite',
                'pulse-slow': 'pulseSlow 3s infinite',
                'shimmer': 'shimmer 2s ease-in-out infinite',
                'slide-in-right': 'slideInRight 0.3s ease-out',
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
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                }
            },
            boxShadow: {
                'ceramic-emboss': '4px 4px 10px rgba(163, 158, 145, 0.15), -4px -4px 10px rgba(255, 255, 255, 0.90)',
                'ceramic-inset': 'inset 3px 3px 6px rgba(163, 158, 145, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                'ceramic-elevated': '5px 5px 10px rgba(163, 158, 145, 0.25), -5px -5px 10px rgba(255, 255, 255, 0.95)',
                // Digital Desire - Landing Page V2 shadows
                'levitation': '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 40px rgba(217, 119, 6, 0.1)',
                'bento': '4px 4px 10px rgba(163, 158, 145, 0.12), -4px -4px 10px rgba(255, 255, 255, 0.8)',
                'bento-hover': '6px 6px 14px rgba(163, 158, 145, 0.18), -6px -6px 14px rgba(255, 255, 255, 0.9)',
            },
            letterSpacing: {
                'tighter': '-0.05em',
            }
        }
    },
    plugins: [],
}
