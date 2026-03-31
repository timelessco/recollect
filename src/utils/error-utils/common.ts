/* oxlint-disable max-classes-per-file -- error classes are intentionally grouped in one file */

export const HttpStatus = {
  // 2xx Success
  ACCEPTED: 202,
  // 5xx Server Errors
  BAD_GATEWAY: 502,
  // 4xx Client Errors
  BAD_REQUEST: 400,
  CONFLICT: 409,

  CREATED: 201,
  FORBIDDEN: 403,
  // 3xx Redirection
  FOUND: 302,
  GATEWAY_TIMEOUT: 504,

  GONE: 410,
  IM_A_TEAPOT: 418,
  INTERNAL_SERVER_ERROR: 500,
  METHOD_NOT_ALLOWED: 405,
  MOVED_PERMANENTLY: 301,
  NO_CONTENT: 204,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  NOT_MODIFIED: 304,
  OK: 200,
  SERVICE_UNAVAILABLE: 503,

  TEMPORARY_REDIRECT: 307,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UNPROCESSABLE_ENTITY: 422,
  UNSUPPORTED_MEDIA_TYPE: 415,
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
    this.name = "BaseError";
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
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", cause);
    this.name = "InternalServerError";
  }
}

export class NotFoundError extends BaseError {
  constructor(message = "Not Found", cause?: unknown) {
    super(message, HttpStatus.NOT_FOUND, "NOT_FOUND", cause);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends BaseError {
  constructor(message = "Bad Request", cause?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST", cause);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = "Unauthorized", cause?: unknown) {
    super(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", cause);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = "Forbidden", cause?: unknown) {
    super(message, HttpStatus.FORBIDDEN, "FORBIDDEN", cause);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends BaseError {
  constructor(message = "Conflict", cause?: unknown) {
    super(message, HttpStatus.CONFLICT, "CONFLICT", cause);
    this.name = "ConflictError";
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = "Authentication Error", cause?: unknown) {
    super(message, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR", cause);
    this.name = "AuthenticationError";
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
    this.name = "BaseApplicationError";
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
    this.name = "ApplicationError";
  }
}
