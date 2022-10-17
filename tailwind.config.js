// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin = require('tailwindcss/plugin');

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
          7: '#E8E8E8',
        },
      },
      dropShadow: {
        'custom-1': '0px 0px 2.5px rgba(0, 0, 0, 0.11)',
      },
      boxShadow: {
        'custom-1':
          '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    plugin(function ({ addVariant }) {
      addVariant('data-active-item', `&[data-active-item]`);
    }),
  ],
};
