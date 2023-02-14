/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      babelrc: false,
      configFile: false,
      presets: ["@babel/preset-env"],
    },
  },
  ignorePatterns: ["sentry.client.config.ts"],
  extends: [
    "eslint:recommended",
    "airbnb-base",
    "plugin:prettier/recommended",
    "plugin:@next/next/recommended",
  ],
  plugins: ["import"],
  rules: {
    // eslint core
    // Allow console.log in development
    "no-console": "off",
    // Explicitly allow unused variables starting with _ (e.g. _req, _res) to
    // indicate that they are unused on purpose
    "no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "func-names": "off",
    // Allow reassigning props in react
    "no-param-reassign": ["error", { props: false }],
    // Use function hoisting to improve code readability
    "no-use-before-define": "off",
    // This is a personal preference doesn't affect code readability or performance
    "no-underscore-dangle": "off",
    // Node 16 requires the explicit use of file extensions
    "import/extensions": [
      "error",
      "always",
      {
        ignorePackages: true,
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never",
      },
    ],

    // import rules
    "import/no-extraneous-dependencies": ["off"],
    "import/prefer-default-export": "off",
  },
  overrides: [
    {
      // all typescript files
      files: ["*.ts", "*.tsx"],
      env: {
        es2021: true,
        browser: true,
        node: true,
        jest: true,
      },
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
        project: "tsconfig.json",
      },
      extends: [
        "eslint:recommended",
        "react-app",
        "react-app/jest",
        "airbnb",
        "airbnb-typescript",
        "airbnb/hooks",
        "plugin:jsx-a11y/recommended",
        "plugin:import/typescript",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
        "plugin:@next/next/recommended",
        "plugin:tailwindcss/recommended",
      ],
      plugins: [
        "import",
        "jsx-a11y",
        "react",
        "@typescript-eslint",
        "tailwindcss",
      ],
      rules: {
        // eslint core
        // Allow console.log in development
        "no-console": "off",
        // Explicitly allow unused variables starting with _ (e.g. _req, _res) to
        // indicate that they are unused on purpose
        "no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "func-names": "off",
        // Allow reassigning props in react
        "no-param-reassign": ["error", { props: false }],
        // Use function hoisting to improve code readability
        "no-use-before-define": "off",
        // This is a personal preference doesn't affect code readability or performance
        "no-underscore-dangle": "off",

        // import
        "import/first": "error",
        "import/newline-after-import": "error",
        "import/no-duplicates": "error",
        "import/export": "error",
        "import/no-deprecated": "warn",
        "import/prefer-default-export": "off",
        "import/no-extraneous-dependencies": [
          "error",
          {
            devDependencies: ["**/*.setup.ts", "**/__tests__/**"],
          },
        ],
        "import/no-cycle": "off",

        // jsx-a11y
        "jsx-a11y/anchor-is-valid": "off",

        // react
        "react/react-in-jsx-scope": ["off"],
        "react/jsx-uses-react": ["off"],
        "react/jsx-props-no-spreading": ["off"],
        "react/no-unescaped-entities": ["off"],
        "react/function-component-definition": [
          "error",
          { namedComponents: "arrow-function" },
        ],
        "react/prop-types": ["off"],
        "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
        "react/require-default-props": ["off"],

        // Allow most functions to rely on type inference. If the function is exported, then `@typescript-eslint/explicit-module-boundary-types` will ensure it's typed.
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/ban-ts-comment": [
          "error",
          { "ts-expect-error": "allow-with-description" },
        ],
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "variable",
            format: ["camelCase", "PascalCase", "UPPER_CASE"],
            leadingUnderscore: "allow",
          },
        ],
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: false,
          },
        ],
      },
    },
  ],
  settings: {
    tailwindcss: {
      callee: ["clsx"],
      config: "tailwind.config.cjs",
    },
  },
};

module.exports = config;
