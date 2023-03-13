const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  future: {
    relativeContentPathsByDefault: true,
  },
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter V", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        "custom-gray": {
          1: "#383838",
          2: "rgba(0, 0, 0, 0.04)",
          3: "#707070",
          4: "rgba(0, 0, 0, 0.13)",
          5: "#171717",
          6: "rgba(236, 236, 236, 0.86)",
          7: "#E8E8E8",
          8: "#f3f3f3",
          9: "#EDEDED",
          10: "#858585",
          11: "rgba(0, 0, 0, 0.047)",
          12: "rgba(0, 0, 0, 0.071)",
          13: "rgba(0, 0, 0, 0.141)",
          14: "#2A2B2E", // test color for dark button hover
        },
        "custom-white": {
          1: "rgba(255, 255, 255, 0.9)",
        },
      },

      dropShadow: {
        "custom-1": "0px 0px 2.5px rgba(0, 0, 0, 0.11)",
      },
      boxShadow: {
        "custom-1":
          "0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)",
        "custom-2":
          "0px 0px 1px rgba(0, 0, 0, 0.4), 0px 1px 2px rgba(0, 0, 0, 0.15)",
        "custom-3":
          "0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)",
        "custom-4":
          "0px 64px 74px rgba(0, 0, 0, 0.08), 0px 17.9672px 35.1912px rgba(0, 0, 0, 0.0427215), 0px 8.53023px 25.3083px rgba(0, 0, 0, 0.0302528), 0px 4.48693px 17.6765px rgba(0, 0, 0, 0.0221708), 0px 2.0298px 9.41891px rgba(0, 0, 0, 0.0146447)",
        "custom-5": "inset 0px 0px 1px rgba(0, 0, 0, 0.11)",
      },
      fontSize: {
        40: "40px",
        13: "13px",
      },
      fontWeight: {
        450: "450",
      },
    },
  },
  plugins: [],
};
