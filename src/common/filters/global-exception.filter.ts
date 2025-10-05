import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * Global Exception Filter - Provides consistent error responses across the application
 * Handles HTTP exceptions, database errors, and validation failures
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errors: any[] = [];

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errors = responseObj.errors || [];
        
        // Handle validation errors from class-validator
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          errors = responseObj.message.map((msg: string) => ({
            message: msg,
          }));
        }
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof QueryFailedError) {
      // Handle database constraint violations
      status = HttpStatus.CONFLICT;
      message = this.handleDatabaseError(exception);
    } else if (exception instanceof EntityNotFoundError) {
      // Handle entity not found errors
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      this.logger.error('Unexpected error:', exception);
    }

    const errorResponse = {
      statusCode: status,
      message,
      ...(errors.length > 0 && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Log error details for debugging
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }

  /**
   * Handle database-specific errors and provide meaningful messages
   */
  private handleDatabaseError(error: QueryFailedError): string {
    const message = error.message.toLowerCase();

    // Handle unique constraint violations
    if (message.includes('unique constraint') || message.includes('duplicate key')) {
      if (message.includes('email')) {
        return 'Email address is already in use';
      }
      if (message.includes('phone')) {
        return 'Phone number is already in use';
      }
      if (message.includes('kaha_id') || message.includes('kahaid')) {
        return 'KahaId is already in use';
      }
      if (message.includes('unique_department_name_per_business')) {
        return 'Department name already exists in this business';
      }
      if (message.includes('department_entity_assignments')) {
        return 'Entity is already assigned to this department';
      }
      return 'Duplicate entry detected';
    }

    // Handle foreign key constraint violations
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      if (message.includes('department')) {
        return 'Referenced department does not exist';
      }
      if (message.includes('entity')) {
        return 'Referenced entity does not exist';
      }
      return 'Referenced resource does not exist';
    }

    // Handle check constraint violations
    if (message.includes('check constraint')) {
      if (message.includes('latitude')) {
        return 'Latitude must be between -90 and 90 degrees';
      }
      if (message.includes('longitude')) {
        return 'Longitude must be between -180 and 180 degrees';
      }
      if (message.includes('radius')) {
        return 'Radius must be between 10 and 1000 meters';
      }
      return 'Data validation constraint violated';
    }

    // Handle not null constraint violations
    if (message.includes('not null constraint') || message.includes('null value')) {
      return 'Required field cannot be empty';
    }

    // Default database error message
    return 'Database operation failed';
  }
}