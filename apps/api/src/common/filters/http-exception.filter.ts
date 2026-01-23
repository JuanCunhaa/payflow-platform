import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

type HttpExceptionResponse =
  | {
    message?: string | string[];
    code?: string;
    [key: string]: unknown;
  }
  | string;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse() as HttpExceptionResponse;

      // Rate limit (429) normalization
      if (exception instanceof ThrottlerException) {
        return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          code: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again later.',
          status: HttpStatus.TOO_MANY_REQUESTS,
          timestamp,
          path: req.url,
        });
      }

      // If a structured response with code is provided, respect it and enrich.
      if (resp && typeof resp === 'object' && resp.code) {
        return res.status(status).json({
          ...resp,
          status,
          timestamp,
          path: req.url,
        });
      }

      // Validation errors normalization (from ValidationPipe)
      if (exception instanceof BadRequestException) {
        const r = resp as any;
        const messages = Array.isArray(r?.message)
          ? r.message
          : [r?.message].filter(Boolean);
        return res.status(status).json({
          code: 'validation_error',
          message: 'Validation failed',
          errors: messages,
          status,
          timestamp,
          path: req.url,
        });
      }

      // Not found normalization
      if (exception instanceof NotFoundException) {
        return res.status(status).json({
          code: 'not_found',
          message: 'Resource not found',
          status,
          timestamp,
          path: req.url,
        });
      }

      // Forbidden normalization
      if (exception instanceof ForbiddenException) {
        return res.status(status).json({
          code: 'forbidden',
          message: 'Forbidden',
          status,
          timestamp,
          path: req.url,
        });
      }

      // Unauthorized normalization
      if (exception instanceof UnauthorizedException) {
        return res.status(status).json({
          code: 'unauthorized',
          message: 'Unauthorized',
          status,
          timestamp,
          path: req.url,
        });
      }

      // Generic HttpException fallback
      return res.status(status).json({
        code: 'http_error',
        message: typeof resp === 'string' ? resp : resp?.message || 'HTTP Error',
        status,
        timestamp,
        path: req.url,
      });
    }

    // Non-HTTP exceptions
    return res.status(500).json({
      code: 'internal_error',
      message: 'Internal server error',
      status: 500,
      timestamp,
      path: req.url,
    });
  }
}
