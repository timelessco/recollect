import { defineConfig } from "cypress";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
	e2e: {
		baseUrl: process.env.NEXT_PUBLIC_VERCEL_URL,

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
