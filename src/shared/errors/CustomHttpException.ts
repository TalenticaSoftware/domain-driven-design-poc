export class CustomHttpException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CustomHttpException';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CustomHttpException.prototype);
  }

  public static badRequest(message: string, code = 'BAD_REQUEST'): CustomHttpException {
    return new CustomHttpException(message, 400, code);
  }

  public static notFound(message: string, code = 'NOT_FOUND'): CustomHttpException {
    return new CustomHttpException(message, 404, code);
  }

  public static conflict(message: string, code = 'CONFLICT'): CustomHttpException {
    return new CustomHttpException(message, 409, code);
  }

  public static unprocessable(message: string, code = 'UNPROCESSABLE_ENTITY'): CustomHttpException {
    return new CustomHttpException(message, 422, code);
  }

  public static internal(message: string, code = 'INTERNAL_SERVER_ERROR'): CustomHttpException {
    return new CustomHttpException(message, 500, code);
  }
}
