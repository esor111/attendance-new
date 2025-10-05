/**
 * DTO for entity response with full details
 * Requirements: 5.1
 */
export class EntityResponseDto {
  id: string;
  name: string;
  kahaId: string;
  address?: string;
  geohash: string;
  location: {
    type: string;
    coordinates: number[];
  };
  radiusMeters: number;
  avatarUrl?: string;
  coverImageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  departmentAssignments?: Array<{
    id: string;
    departmentId: string;
    isPrimary: boolean;
    department?: {
      id: string;
      name: string;
      businessId: string;
    };
  }>;
}

/**
 * DTO for entity list response
 */
export class EntityListResponseDto {
  entities: Array<{
    id: string;
    name: string;
    kahaId: string;
    address?: string;
    radiusMeters: number;
    assignedDepartments: number;
    createdAt: Date;
  }>;
  totalCount: number;
}