export const HttpStatus = {
	// 2xx Success
	ACCEPTED: 202,
	CREATED: 201,
	NO_CONTENT: 204,
	OK: 200,

	// 3xx Redirection
	FOUND: 302,
	MOVED_PERMANENTLY: 301,
	NOT_MODIFIED: 304,
	TEMPORARY_REDIRECT: 307,

	// 4xx Client Errors
	BAD_REQUEST: 400,
	CONFLICT: 409,
	FORBIDDEN: 403,
	GONE: 410,
	IM_A_TEAPOT: 418,
	METHOD_NOT_ALLOWED: 405,
	NOT_FOUND: 404,
	TOO_MANY_REQUESTS: 429,
	UNAUTHORIZED: 401,
	UNPROCESSABLE_ENTITY: 422,
	UNSUPPORTED_MEDIA_TYPE: 415,

	// 5xx Server Errors
	BAD_GATEWAY: 502,
	GATEWAY_TIMEOUT: 504,
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	SERVICE_UNAVAILABLE: 503,
} as const;

type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export class BaseError extends Error {
	cause?: unknown;

	code: string;

	statusCode: HttpStatusCode;

	constructor(
		message: string,
		statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
		code = "INTERNAL_SERVER_ERROR",
		cause?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode;
		this.code = code;
		this.cause = cause;
	}

	toJSON() {
		return {
			code: this.code,
			error: this.name,
			message: this.message,
			statusCode: this.statusCode,
		};
	}
}

export class InternalServerError extends BaseError {
	constructor(message = "Internal Server Error", cause?: unknown) {
		super(
			message,
			HttpStatus.INTERNAL_SERVER_ERROR,
			"INTERNAL_SERVER_ERROR",
			cause,
		);
	}
}

export class NotFoundError extends BaseError {
	constructor(message = "Not Found", cause?: unknown) {
		super(message, HttpStatus.NOT_FOUND, "NOT_FOUND", cause);
	}
}

export class BadRequestError extends BaseError {
	constructor(message = "Bad Request", cause?: unknown) {
		super(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST", cause);
	}
}

export class UnauthorizedError extends BaseError {
	constructor(message = "Unauthorized", cause?: unknown) {
		super(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", cause);
	}
}

export class ForbiddenError extends BaseError {
	constructor(message = "Forbidden", cause?: unknown) {
		super(message, HttpStatus.FORBIDDEN, "FORBIDDEN", cause);
	}
}

export class ConflictError extends BaseError {
	constructor(message = "Conflict", cause?: unknown) {
		super(message, HttpStatus.CONFLICT, "CONFLICT", cause);
	}
}

export class AuthenticationError extends BaseError {
	constructor(message = "Authentication Error", cause?: unknown) {
		super(message, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR", cause);
	}
}

export class BaseApplicationError extends Error {
	code: string;

	constructor(
		message = "An unexpected error occurred",
		code = "APPLICATION_ERROR",
		cause?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.cause = cause;
	}

	toJSON() {
		return {
			cause: this.cause,
			error: this.name,
			message: this.message,
		};
	}
}

export class ApplicationError extends BaseApplicationError {
	constructor(message = "Application Error", cause?: unknown) {
		super(message, "APPLICATION_ERROR", cause);
	}
}
