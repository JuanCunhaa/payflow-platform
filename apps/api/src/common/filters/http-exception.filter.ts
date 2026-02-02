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
      return this.handleHttpException(exception, res, req, timestamp);
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

  private handleHttpException(
    exception: HttpException,
    res: Response,
    req: Request,
    timestamp: string
  ) {
    const status = exception.getStatus();
    const resp = exception.getResponse() as HttpExceptionResponse;

    if (exception instanceof ThrottlerException) {
      return this.handleThrottlerException(res, req, timestamp);
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

    if (exception instanceof BadRequestException) {
      return this.handleBadRequest(resp, status, res, req, timestamp);
    }

    if (exception instanceof NotFoundException) {
      return this.handleNotFound(status, res, req, timestamp);
    }

    if (exception instanceof ForbiddenException) {
      return this.handleForbidden(status, res, req, timestamp);
    }

    if (exception instanceof UnauthorizedException) {
      return this.handleUnauthorized(status, res, req, timestamp);
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

  private handleThrottlerException(res: Response, req: Request, timestamp: string) {
    return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
      status: HttpStatus.TOO_MANY_REQUESTS,
      timestamp,
      path: req.url,
    });
  }

  private handleBadRequest(
    resp: HttpExceptionResponse,
    status: number,
    res: Response,
    req: Request,
    timestamp: string
  ) {
    const r = typeof resp === 'object' && resp !== null ? (resp as Record<string, unknown>) : {};
    const messageVal = r.message;
    const messages = Array.isArray(messageVal) ? messageVal : [messageVal].filter(Boolean);
    return res.status(status).json({
      code: 'validation_error',
      message: 'Validation failed',
      errors: messages,
      status,
      timestamp,
      path: req.url,
    });
  }

  private handleNotFound(status: number, res: Response, req: Request, timestamp: string) {
    return res.status(status).json({
      code: 'not_found',
      message: 'Resource not found',
      status,
      timestamp,
      path: req.url,
    });
  }

  private handleForbidden(status: number, res: Response, req: Request, timestamp: string) {
    return res.status(status).json({
      code: 'forbidden',
      message: 'Forbidden',
      status,
      timestamp,
      path: req.url,
    });
  }

  private handleUnauthorized(status: number, res: Response, req: Request, timestamp: string) {
    return res.status(status).json({
      code: 'unauthorized',
      message: 'Unauthorized',
      status,
      timestamp,
      path: req.url,
    });
  }
}
