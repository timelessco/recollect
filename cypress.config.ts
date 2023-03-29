import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		// on, config
		setupNodeEvents() {
			// implement node event listeners here
		},
	},
	env: {
		test_email: "test@test.com",
		test_password: "qqqqqq",
	},
});
