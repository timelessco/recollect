import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		// on, config
		setupNodeEvents() {
			// implement node event listeners here
		},
	},
	env: {
		test_email: "test16@test.com",
		test_password: "123456",
	},
});
