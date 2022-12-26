import { defineConfig } from 'cypress';
// import { TEST_EMAIL, TEST_PASSWORD } from './cypressEnv';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  env: {
    test_email: 'test@test.com',
    test_password: 'qqqqqq',
  },
});
