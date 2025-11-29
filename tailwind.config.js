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
                'ceramic-highlight': '#E6D5C3',
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
            }
        }
    },
    plugins: [],
}
