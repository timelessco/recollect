import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents() // on, config
    {
      // implement node event listeners here
    },
  },
  env: {
    test_email: "test@test.com",
    test_password: "qqqqqq",
  },
});
