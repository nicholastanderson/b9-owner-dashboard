/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand + surface tokens (mirror the Claude Design token sheet).
        page: '#0b1016',
        ink: '#111921', // --bg / ink
        surface: '#18212b', // tile
        track: '#1b2530', // progress track
        accent: '#96cb39', // brand green — growth / on pace
        'accent-dark': '#7ba82b', // progress gradient start
        danger: '#e2564a', // behind pace / churn
        amber: '#e8b23a', // warning
        gold: '#f4c542', // star rating
        text: '#ffffff',
        'text-soft': '#c5cfd8',
        'text-muted': '#8a97a5',
        'text-label': '#6f7d8a',
      },
      fontFamily: {
        // Anton = numbers + brand only. Saira Condensed = everything else.
        display: ['Anton', 'sans-serif'],
        sans: ['"Saira Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
