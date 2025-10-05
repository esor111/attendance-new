import { Entity } from '../../entity/entities/entity.entity';
import { UserEntityAssignment } from '../entities/user-entity-assignment.entity';
import { DepartmentEntityAssignment } from '../../department/entities/department-entity-assignment.entity';

/**
 * Response DTOs for entity access operations
 * Requirements: 5.1, 5.2, 5.3 - Complete assignment information
 */

export class EntityAccessResponseDto {
  id: string;
  name: string;
  kahaId: string;
  address?: string;
  radiusMeters: number;
  isPrimary?: boolean;
  assignmentType: 'user' | 'department';
}

export class UserEntityAssignmentsResponseDto {
  userAssignments: {
    id: string;
    entityId: string;
    isPrimary: boolean;
    entity: {
      id: string;
      name: string;
      kahaId: string;
      address?: string;
      radiusMeters: number;
    };
  }[];
  
  departmentAssignments: {
    id: string;
    entityId: string;
    isPrimary: boolean;
    entity: {
      id: string;
      name: string;
      kahaId: string;
      address?: string;
      radiusMeters: number;
    };
  }[];
  
  combinedEntities: EntityAccessResponseDto[];
}

export class EntityValidationResponseDto {
  hasAccess: boolean;
  entity?: {
    id: string;
    name: string;
    kahaId: string;
    address?: string;
    radiusMeters: number;
  };
  accessType?: 'user' | 'department' | 'both';
}