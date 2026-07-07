/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App uses a dark, high-contrast palette for gym/low-light use.
        base: '#0f172a',
        surface: '#1e293b',
        accent: '#38bdf8',
        success: '#22c55e',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
