// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pageComponents/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter V', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'custom-gray': {
          1: '#383838',
          2: 'rgba(0, 0, 0, 0.04)',
          3: '#707070',
          4: 'rgba(0, 0, 0, 0.13)',
          5: '#171717',
          6: 'rgba(236, 236, 236, 0.86)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
