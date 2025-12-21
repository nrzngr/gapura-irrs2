/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            /* Colors mapped to CSS variables */
            colors: {
                surface: {
                    1: 'var(--surface-1)',
                    2: 'var(--surface-2)',
                    3: 'var(--surface-3)',
                    4: 'var(--surface-4)',
                },
                brand: {
                    primary: 'var(--brand-primary)',
                    light: 'var(--brand-primary-light)',
                    accent: 'var(--brand-accent)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                border: {
                    subtle: 'var(--border-subtle)',
                    medium: 'var(--border-medium)',
                },
                status: {
                    success: 'var(--status-success)',
                    'success-light': 'var(--status-success-light)',
                    warning: 'var(--status-warning)',
                    'warning-light': 'var(--status-warning-light)',
                    error: 'var(--status-error)',
                    'error-light': 'var(--status-error-light)',
                    info: 'var(--status-info)',
                    'info-light': 'var(--status-info-light)',
                },
            },

            /* Font Families */
            fontFamily: {
                display: ['var(--font-display)', 'system-ui', 'sans-serif'],
                body: ['var(--font-body)', 'system-ui', 'sans-serif'],
            },

            /* Fluid Font Sizes */
            fontSize: {
                'fluid-xs': 'var(--text-xs)',
                'fluid-sm': 'var(--text-sm)',
                'fluid-base': 'var(--text-base)',
                'fluid-lg': 'var(--text-lg)',
                'fluid-xl': 'var(--text-xl)',
                'fluid-2xl': 'var(--text-2xl)',
                'fluid-3xl': 'var(--text-3xl)',
                'fluid-4xl': 'var(--text-4xl)',
                'fluid-5xl': 'var(--text-5xl)',
                'fluid-6xl': 'var(--text-6xl)',
            },

            /* Spacing */
            spacing: {
                'space-xs': 'var(--space-xs)',
                'space-sm': 'var(--space-sm)',
                'space-md': 'var(--space-md)',
                'space-lg': 'var(--space-lg)',
                'space-xl': 'var(--space-xl)',
                'space-2xl': 'var(--space-2xl)',
                'space-3xl': 'var(--space-3xl)',
                'section': 'var(--section-padding)',
            },

            /* Border Radius */
            borderRadius: {
                'prism-sm': 'var(--radius-sm)',
                'prism-md': 'var(--radius-md)',
                'prism-lg': 'var(--radius-lg)',
                'prism-xl': 'var(--radius-xl)',
                'prism-2xl': 'var(--radius-2xl)',
                'prism-3xl': 'var(--radius-3xl)',
            },

            /* Box Shadows */
            boxShadow: {
                'brand-sm': 'var(--shadow-brand-sm)',
                'brand-md': 'var(--shadow-brand-md)',
                'brand-lg': 'var(--shadow-brand-lg)',
                'neutral-sm': 'var(--shadow-neutral-sm)',
                'neutral-md': 'var(--shadow-neutral-md)',
                'neutral-lg': 'var(--shadow-neutral-lg)',
                'elevated': 'var(--shadow-elevated)',
            },

            /* Transitions with Spring Physics */
            transitionTimingFunction: {
                'spring-snappy': 'var(--spring-snappy)',
                'spring-bouncy': 'var(--spring-bouncy)',
                'spring-smooth': 'var(--spring-smooth)',
                'spring-gentle': 'var(--spring-gentle)',
            },

            transitionDuration: {
                'instant': 'var(--duration-instant)',
                'fast': 'var(--duration-fast)',
                'normal': 'var(--duration-normal)',
                'slow': 'var(--duration-slow)',
                'slower': 'var(--duration-slower)',
            },

            /* Animation */
            animation: {
                'spring-in': 'springIn var(--duration-slow) var(--spring-bouncy) forwards',
                'spring-up': 'springUp var(--duration-slow) var(--spring-snappy) forwards',
                'fade-in': 'fadeIn var(--duration-normal) var(--spring-smooth) forwards',
                'scale-in': 'scaleIn var(--duration-normal) var(--spring-snappy) forwards',
            },

            keyframes: {
                springIn: {
                    '0%': { opacity: '0', transform: 'scale(0.8)' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                springUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [
        // Container Queries plugin support
        function({ addUtilities }) {
            addUtilities({
                '.container-query': {
                    'container-type': 'inline-size',
                },
            });
        },
    ],
};
