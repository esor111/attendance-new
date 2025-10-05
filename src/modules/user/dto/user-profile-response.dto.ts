/**
 * DTO for user profile response
 * Includes user data with department relationship
 * Requirements: 4.1
 */
export class UserProfileResponseDto {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  userId?: string; // External microservice ID
  isFieldWorker: boolean;
  departmentId?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  department?: {
    id: string;
    name: string;
    businessId: string;
  };
}

/**
 * DTO for user existence check response
 */
export class UserExistsResponseDto {
  exists: boolean;
  userId?: string;
  lastSyncedAt?: Date;
}