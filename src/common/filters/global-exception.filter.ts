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
      if (message.includes('unique_user_date')) {
        return 'Attendance record already exists for this user and date';
      }
      if (message.includes('user_entity_assignments')) {
        return 'User is already assigned to this entity';
      }
      return 'Duplicate entry detected';
    }

    // Handle foreign key constraint violations
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      if (message.includes('user_id')) {
        return 'Referenced user does not exist or is not synchronized';
      }
      if (message.includes('entity_id')) {
        return 'Referenced entity does not exist';
      }
      if (message.includes('department_id')) {
        return 'Referenced department does not exist';
      }
      if (message.includes('attendance_id')) {
        return 'Referenced attendance record does not exist';
      }
      if (message.includes('manager_id') || message.includes('employee_id')) {
        return 'Referenced user in reporting structure does not exist';
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
      if (message.includes('total_hours')) {
        return 'Total hours must be between 0 and 24 hours';
      }
      if (message.includes('travel_speed')) {
        return 'Travel speed cannot be negative';
      }
      if (message.includes('session_duration')) {
        return 'Session duration cannot be negative';
      }
      if (message.includes('visit_duration')) {
        return 'Visit duration cannot be negative';
      }
      return 'Data validation constraint violated';
    }

    // Handle not null constraint violations
    if (message.includes('not null constraint') || message.includes('null value')) {
      if (message.includes('user_id')) {
        return 'User ID is required';
      }
      if (message.includes('entity_id')) {
        return 'Entity ID is required';
      }
      if (message.includes('date')) {
        return 'Date is required';
      }
      if (message.includes('check_in_time')) {
        return 'Check-in time is required';
      }
      if (message.includes('latitude') || message.includes('longitude')) {
        return 'Location coordinates are required';
      }
      return 'Required field cannot be empty';
    }

    // Handle attendance-specific constraint violations
    if (message.includes('attendance')) {
      if (message.includes('clock_out_without_clock_in')) {
        return 'Cannot clock out without clocking in first';
      }
      if (message.includes('session_without_attendance')) {
        return 'Cannot create session without active daily attendance';
      }
      if (message.includes('location_log_without_attendance')) {
        return 'Cannot create location log without active daily attendance';
      }
    }

    // Handle circular reference violations
    if (message.includes('circular') || message.includes('recursive')) {
      return 'Circular reference detected in reporting structure';
    }

    // Default database error message
    return 'Database operation failed';
  }
}