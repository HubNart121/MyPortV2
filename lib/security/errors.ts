export class AuthenticationRequiredError extends Error {
  readonly status = 401;
  readonly code = 'AUTHENTICATION_REQUIRED';

  constructor() {
    super('Authentication is required');
    this.name = 'AuthenticationRequiredError';
  }
}

export class AuthorizationDeniedError extends Error {
  readonly status = 403;
  readonly code = 'AUTHORIZATION_DENIED';

  constructor() {
    super('This account is not authorized');
    this.name = 'AuthorizationDeniedError';
  }
}

export type SecurityAccessError =
  | AuthenticationRequiredError
  | AuthorizationDeniedError;

export function isSecurityAccessError(error: unknown): error is SecurityAccessError {
  return error instanceof AuthenticationRequiredError
    || error instanceof AuthorizationDeniedError;
}

