import { extendTailwindMerge } from 'tailwind-merge';

export const cx = (...classNames: any[]) =>
  classNames.filter(Boolean).join(' ');

export const tcm = extendTailwindMerge({
  theme: {
    colors: [{ 'custom-gray': ['1', '2', '3', '4', '5', '6'] }],
  },
  classGroups: {
    'drop-shadow': [
      {
        'drop-shadow': ['custom-1'],
      },
    ],
  },
});
