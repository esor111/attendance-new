import { 
  Controller, 
  Get, 
  Put, 
  Param, 
  Body, 
  ParseUUIDPipe, 
  ValidationPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { 
  UpdateUserProfileDto, 
  UserProfileResponseDto, 
  UserExistsResponseDto,
  UserAccessStatusDto,
  EntityAccessResponseDto,
  UserAccessibleEntitiesResponseDto
} from './dto';

/**
 * User Controller - REST endpoints for user management
 * Handles profile retrieval and updates as per requirements
 * Demonstrates handshake process integration
 */
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get user by external userId - demonstrates handshake process
   * This endpoint will automatically fetch user from external service if not found locally
   * 
   * @param userId External user ID from User Microservice
   * @returns User data with populated local record
   */
  @ApiOperation({
    summary: 'Get user by external ID (Handshake Process)',
    description: 'Retrieves user data by external userId. If user does not exist locally, automatically fetches from User Microservice and saves locally.',
  })
  @ApiParam({
    name: 'userId',
    description: 'External user ID from User Microservice',
    example: 'ext-user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'User data retrieved successfully',
    type: User,
  })
  @ApiNotFoundResponse({
    description: 'User not found in external service',
  })
  @ApiBadRequestResponse({
    description: 'Invalid user ID format',
  })
  @Get('external/:userId')
  async getUserByExternalId(@Param('userId') userId: string): Promise<User> {
    return this.userService.getUserByExternalId(userId);
  }

  /**
   * Check if user exists locally without triggering external fetch
   * Useful for quick existence checks
   * 
   * @param userId External user ID
   * @returns Boolean indicating local existence
   */
  @ApiOperation({
    summary: 'Check if user exists locally',
    description: 'Checks if user exists in local database without triggering external API call.',
  })
  @ApiParam({
    name: 'userId',
    description: 'External user ID to check',
    example: 'ext-user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'User existence check completed',
    type: UserExistsResponseDto,
  })
  @Get('external/:userId/exists')
  async checkUserExists(@Param('userId') userId: string): Promise<UserExistsResponseDto> {
    const user = await this.userService.findByExternalUserId(userId);
    return {
      exists: !!user,
      userId: user?.userId,
      lastSyncedAt: user?.lastSyncedAt,
    };
  }

  /**
   * Get user profile by internal UUID
   * GET /users/:id/profile
   * Requirements: 4.1 - Profile retrieval with department relationship
   */
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieves complete user profile including department relationship.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID format',
  })
  @Get(':id/profile')
  async getUserProfile(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileResponseDto> {
    const user = await this.userService.findByIdWithDepartment(id);
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      userId: user.userId,
      isFieldWorker: user.isFieldWorker,
      departmentId: user.departmentId,
      lastSyncedAt: user.lastSyncedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      department: user.department ? {
        id: user.department.id,
        name: user.department.name,
        businessId: user.department.businessId,
      } : undefined,
    };
  }

  /**
   * Update user profile
   * PUT /users/:id/profile
   * Requirements: 4.2, 4.3, 4.4, 4.5 - Profile updates with validation
   */
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates user profile information with validation for email/phone uniqueness.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateUserProfileDto,
    description: 'User profile update data',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserProfileResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiConflictResponse({
    description: 'Email or phone already in use',
  })
  @Put(':id/profile')
  async updateUserProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.updateProfile(id, updateDto);
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      userId: user.userId,
      isFieldWorker: user.isFieldWorker,
      departmentId: user.departmentId,
      lastSyncedAt: user.lastSyncedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      department: user.department ? {
        id: user.department.id,
        name: user.department.name,
        businessId: user.department.businessId,
      } : undefined,
    };
  }

  /**
   * Get entities accessible to a user based on their department assignments
   * GET /users/:id/accessible-entities
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - Entity access control
   */
  @Get(':id/accessible-entities')
  async getUserAccessibleEntities(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccessibleEntitiesResponseDto> {
    return this.userService.getUserAccessibleEntities(id);
  }

  /**
   * Check if user has access to a specific entity
   * GET /users/:id/entities/:entityId/access
   * Requirements: 8.1, 8.4 - Validate user access to entities
   */
  @Get(':id/entities/:entityId/access')
  async checkEntityAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<EntityAccessResponseDto> {
    return this.userService.checkEntityAccess(id, entityId);
  }

  /**
   * Get user's department access validation status
   * GET /users/:id/access-status
   * Requirements: 8.2, 8.3 - Access control validation
   */
  @Get(':id/access-status')
  async getUserAccessStatus(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccessStatusDto> {
    return this.userService.getUserAccessStatus(id);
  }

  // Additional controller methods will be implemented in subsequent tasks
}