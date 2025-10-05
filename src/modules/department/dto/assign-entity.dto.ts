import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for assigning an entity to a department
 */
export class AssignEntityDto {
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;

  @IsOptional()
  @IsBoolean({ message: 'isPrimary must be a boolean value' })
  isPrimary?: boolean = false;
}

/**
 * DTO for setting primary entity
 */
export class SetPrimaryEntityDto {
  @IsUUID(4, { message: 'EntityId must be a valid UUID' })
  entityId: string;
}

/**
 * Response DTO for department entity assignments
 */
export class DepartmentEntityResponseDto {
  id: string;
  departmentId: string;
  entityId: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  entity?: {
    id: string;
    name: string;
    kahaId: string;
    address: string;
    radiusMeters: number;
  };
}

/**
 * Response DTO for user accessible entities
 */
export class UserAccessibleEntityDto {
  id: string;
  name: string;
  kahaId: string;
  address: string;
  radiusMeters: number;
  isPrimary: boolean;
  geohash: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
}