import { ZodError } from "zod";

// Helper to format error message
export const formatErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}

	if (error instanceof ZodError) {
		return error.errors.map((error_) => error_.message).join(", ");
	}

	if (typeof error === "string") {
		return error;
	}

	if (typeof error === "object" && error !== null && "message" in error) {
		return String(error.message);
	}

	return "Unknown error occurred";
};
