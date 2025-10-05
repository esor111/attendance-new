import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Enhanced Validation Pipe with detailed error messages
 * Provides comprehensive validation error reporting
 * Requirements: 10.1, 10.4
 */
@Injectable()
export class EnhancedValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform the object to the target type
    });

    if (errors.length > 0) {
      const formattedErrors = errors.map(error => {
        const constraints = error.constraints || {};
        return {
          field: error.property,
          message: Object.values(constraints)[0] || 'Validation failed',
          value: error.value,
        };
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

/**
 * Coordinate Validation Pipe for geospatial data
 * Validates latitude and longitude ranges
 * Requirements: 5.6, 5.7, 9.5
 */
@Injectable()
export class CoordinateValidationPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value !== 'object' || value === null) {
      throw new BadRequestException('Invalid coordinate data');
    }

    const { latitude, longitude } = value;

    // Validate latitude
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new BadRequestException({
        message: 'Invalid latitude',
        errors: [{
          field: 'latitude',
          message: 'Latitude must be a number between -90 and 90',
          value: latitude,
        }],
      });
    }

    // Validate longitude
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new BadRequestException({
        message: 'Invalid longitude',
        errors: [{
          field: 'longitude',
          message: 'Longitude must be a number between -180 and 180',
          value: longitude,
        }],
      });
    }

    return value;
  }
}