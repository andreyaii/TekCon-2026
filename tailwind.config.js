export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        star: '#f5c518',
        plum: {
          charcoal: '#433C49',
          muted: '#6F6674',
          dark: '#2D2A35',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#FDF6E2',
          dark: '#997300',
          accent: '#F59E0B',
          glow: '#FDE68A',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: { card: '12px' },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,.04)',
        lift: '0 8px 20px rgba(16,24,40,.10)',
      },
    },
  },
  plugins: [],
};
