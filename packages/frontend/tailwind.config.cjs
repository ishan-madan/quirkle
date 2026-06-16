/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f2f0e9',
        ink: '#232323',
        accent: '#1f5cff',
      },
    },
  },
  plugins: [],
};
