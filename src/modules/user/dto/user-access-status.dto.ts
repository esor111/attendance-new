/**
 * DTO for user access status validation
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export class UserAccessStatusDto {
  hasAccess: boolean;
  hasDepartment: boolean;
  departmentHasEntities: boolean;
  accessibleEntitiesCount: number;
  message: string;
  department?: {
    id: string;
    name: string;
    businessId: string;
  };
}

/**
 * DTO for entity access check response
 */
export class EntityAccessResponseDto {
  hasAccess: boolean;
  message: string;
  entity?: {
    id: string;
    name: string;
    kahaId: string;
  };
}

/**
 * DTO for user accessible entities response
 */
export class UserAccessibleEntitiesResponseDto {
  entities: Array<{
    id: string;
    name: string;
    kahaId: string;
    address?: string;
    radiusMeters: number;
    isPrimary: boolean;
    geohash: string;
    location: {
      type: string;
      coordinates: number[];
    };
    avatarUrl?: string;
    coverImageUrl?: string;
    description?: string;
  }>;
  totalCount: number;
  primaryEntity?: {
    id: string;
    name: string;
    kahaId: string;
  };
}