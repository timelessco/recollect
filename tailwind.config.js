// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/pageComponents/**/*.{js,ts,jsx,tsx}',
    './src/utils/commonClassNames.ts',
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
          8: '#f3f3f3',
          9: '#EDEDED',
          10: '#858585',
        },
      },
      dropShadow: {
        'custom-1': '0px 0px 2.5px rgba(0, 0, 0, 0.11)',
      },
      boxShadow: {
        'custom-1':
          '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'custom-2':
          '0px 0px 1px rgba(0, 0, 0, 0.4), 0px 1px 2px rgba(0, 0, 0, 0.15)',
        'custom-3':
          '0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)',
      },
      fontSize: {
        40: '40px',
        13: '13px',
      },
      fontWeight: {
        450: '450',
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
