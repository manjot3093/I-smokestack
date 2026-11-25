/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Montserrat"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Montserrat"', 'system-ui', 'sans-serif'],
        hand: ['"Caveat"', 'cursive'],
      },
      colors: {
        studioBg: '#0e0e0e',
        studioBone: '#f4f1ea',
        cream: '#f5f1e6',
        terracotta: '#c2410c',
        terracottaHover: '#d9520f',
        peach: '#e8b48a',
        pine: '#083d2a',
      },
    },
  },
  plugins: [],
};
