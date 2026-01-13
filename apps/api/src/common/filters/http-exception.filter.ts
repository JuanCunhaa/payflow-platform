import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse() as any;

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
        const messages = Array.isArray(resp?.message)
          ? resp.message
          : [resp?.message].filter(Boolean);
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
