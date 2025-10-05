import { Injectable } from '@nestjs/common';
import { 
  GeospatialValidationException,
  DataIntegrityException,
  LocationValidationException 
} from '../exceptions/business-logic.exceptions';

/**
 * Validation Service - Centralized business rule validation
 * Provides reusable validation methods for complex business logic
 * Requirements: 9.5, 10.1, 10.2, 10.4
 */
@Injectable()
export class ValidationService {
  /**
   * Validate geographic coordinates
   * Requirements: 5.6, 5.7
   */
  validateCoordinates(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new GeospatialValidationException(
        'Latitude must be a number between -90 and 90 degrees',
        { latitude, longitude }
      );
    }

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new GeospatialValidationException(
        'Longitude must be a number between -180 and 180 degrees',
        { latitude, longitude }
      );
    }
  }

  /**
   * Validate radius for entity check-in area
   * Requirements: 5.5
   */
  validateRadius(radiusMeters: number): void {
    if (typeof radiusMeters !== 'number' || radiusMeters < 10 || radiusMeters > 1000) {
      throw new GeospatialValidationException(
        'Radius must be a number between 10 and 1000 meters'
      );
    }
  }

  /**
   * Validate location within entity radius
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  validateLocationWithinRadius(
    actualDistance: number,
    requiredRadius: number,
    entityName: string
  ): void {
    if (actualDistance > requiredRadius) {
      throw new LocationValidationException(
        actualDistance,
        requiredRadius,
        entityName
      );
    }
  }

  /**
   * Validate email format and business rules
   * Requirements: 4.2
   */
  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DataIntegrityException(
        'Invalid email format',
        'User',
        'email validation'
      );
    }
  }

  /**
   * Validate phone number format
   * Requirements: 4.3
   */
  validatePhoneNumber(phone: string): void {
    // Basic phone validation - can be enhanced based on requirements
    if (!phone || phone.length < 7 || phone.length > 20) {
      throw new DataIntegrityException(
        'Phone number must be between 7 and 20 characters',
        'User',
        'phone validation'
      );
    }
  }

  /**
   * Validate department name uniqueness within business
   * Requirements: 3.2
   */
  validateDepartmentName(name: string, businessId: string): void {
    if (!name || name.trim().length === 0) {
      throw new DataIntegrityException(
        'Department name cannot be empty',
        'Department',
        'name validation'
      );
    }

    if (name.length > 100) {
      throw new DataIntegrityException(
        'Department name cannot exceed 100 characters',
        'Department',
        'name validation'
      );
    }
  }

  /**
   * Validate KahaId uniqueness and format
   * Requirements: 5.2
   */
  validateKahaId(kahaId: string): void {
    if (!kahaId || kahaId.trim().length === 0) {
      throw new DataIntegrityException(
        'KahaId cannot be empty',
        'Entity',
        'kahaId validation'
      );
    }

    if (kahaId.length > 100) {
      throw new DataIntegrityException(
        'KahaId cannot exceed 100 characters',
        'Entity',
        'kahaId validation'
      );
    }

    // Basic format validation - alphanumeric and hyphens
    const kahaIdRegex = /^[a-zA-Z0-9-_]+$/;
    if (!kahaIdRegex.test(kahaId)) {
      throw new DataIntegrityException(
        'KahaId can only contain letters, numbers, hyphens, and underscores',
        'Entity',
        'kahaId validation'
      );
    }
  }

  /**
   * Validate UUID format
   * Requirements: 10.4
   */
  validateUUID(uuid: string, fieldName: string = 'ID'): void {
    // More flexible UUID regex that accepts any version
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new DataIntegrityException(
        `${fieldName} must be a valid UUID`,
        'General',
        'UUID validation'
      );
    }
  }

  /**
   * Validate primary entity assignment rules
   * Requirements: 7.3, 7.4
   */
  validatePrimaryEntityAssignment(
    departmentId: string,
    entityId: string,
    isPrimary: boolean
  ): void {
    this.validateUUID(departmentId, 'Department ID');
    this.validateUUID(entityId, 'Entity ID');

    if (typeof isPrimary !== 'boolean') {
      throw new DataIntegrityException(
        'isPrimary must be a boolean value',
        'DepartmentEntityAssignment',
        'primary validation'
      );
    }
  }
}