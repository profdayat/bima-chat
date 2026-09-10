/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
  ],
  plugins: [require('flowbite/plugin')],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      colors: {
        // flowbite-svelte theme & WhatsApp Teal palette
        primary: {
          50: '#E8FAF6',
          100: '#D0F5ED',
          200: '#A1ECDB',
          300: '#73E3C9',
          400: '#38D4B1',
          500: '#00A884',
          600: '#008069',
          700: '#006654',
          800: '#004D3F',
          900: '#00332A'
        },
        wa: {
          teal: '#00A884',
          'teal-dark': '#008069',
          'bubble-out': '#D9FDD3',
          'bubble-out-dark': '#005C4B',
          'bg-light': '#EFEAE2',
          'bg-dark': '#0B141A',
          'surface-light': '#FFFFFF',
          'surface-dark': '#111B21',
          'surface-elevated': '#F0F2F5',
          'surface-elevated-dark': '#202C33',
          'text-primary': '#111B21',
          'text-primary-dark': '#E9EDEF',
          'text-secondary': '#667781',
          'text-secondary-dark': '#8696A0',
          'border-light': '#E9EDEF',
          'border-dark': '#222D34',
          danger: '#EA0038',
          'danger-dark': '#F15C6D'
        }
      }
    }
  }
};
