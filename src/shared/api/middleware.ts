import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CustomHttpException } from '../errors/CustomHttpException';
import { DomainError } from '../errors/DomainError';
import { logger } from '../infrastructure/logger';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

export const successResponse = <T>(data: T): ApiResponse<T> => ({ success: true, data });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DtoClass<T extends object> = new (...args: any[]) => T;

interface ValidationErrorDetail {
  property: string;
  constraints?: Record<string, string>;
}

const flattenValidationErrors = (
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] => {
  return errors.flatMap((error) => {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;
    const current: ValidationErrorDetail[] = error.constraints
      ? [{ property: propertyPath, constraints: error.constraints }]
      : [];
    const children = error.children?.length
      ? flattenValidationErrors(error.children, propertyPath)
      : [];
    return [...current, ...children];
  });
};

export const validateBody = <T extends object>(dtoClass: DtoClass<T>): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const dto = plainToInstance(dtoClass, req.body ?? {});
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      const details = flattenValidationErrors(errors);
      next(
        new CustomHttpException('Request validation failed', 400, 'VALIDATION_ERROR', {
          errors: details,
        }),
      );
      return;
    }
    req.body = dto;
    next();
  };
};

export const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
};

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof CustomHttpException) {
    logger.warn({ code: error.code, message: error.message }, 'Request failed');
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof DomainError) {
    logger.warn({ code: error.code, message: error.message }, 'Domain rule violated');
    res.status(422).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  logger.error({ message: error.message, stack: error.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
  });
};
