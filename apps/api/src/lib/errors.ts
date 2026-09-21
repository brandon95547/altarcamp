/** Errors that are safe to show a user, carrying the status the API should answer with. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: { path: string; message: string }[]) =>
  new AppError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Sign in to continue.') =>
  new AppError(401, 'unauthorized', message);

export const forbidden = (message = 'You do not have access to this.') =>
  new AppError(403, 'forbidden', message);

export const notFound = (message = 'Not found.') => new AppError(404, 'not_found', message);

export const conflict = (message: string, details?: { path: string; message: string }[]) =>
  new AppError(409, 'conflict', message, details);

/** A deal-rule refusal: the request was well formed, the deal is not ready. */
export const unprocessable = (message: string, details?: { path: string; message: string }[]) =>
  new AppError(422, 'deal_not_ready', message, details);
