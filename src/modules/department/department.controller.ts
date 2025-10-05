import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Delete, 
  Param, 
  Body, 
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { 
  AssignEntityDto, 
  DepartmentEntityResponseDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
  DepartmentListResponseDto
} from './dto';

/**
 * Department Controller - REST endpoints for department management
 * Handles CRUD operations and entity assignments
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */
@ApiTags('departments')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  /**
   * Create a new department
   * POST /departments
   * Requirements: 3.1, 3.2, 3.3
   */
  @ApiOperation({
    summary: 'Create new department',
    description: 'Creates a new department within a business with unique name validation.',
  })
  @ApiBody({
    type: CreateDepartmentDto,
    description: 'Department creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'Department created successfully',
    type: DepartmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiConflictResponse({
    description: 'Department name already exists in this business',
  })
  @Post()
  async createDepartment(
    @Body(ValidationPipe) createDepartmentDto: CreateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.create(createDepartmentDto);
  }

  /**
   * Get all departments with pagination
   * GET /departments?page=1&limit=20&businessId=uuid
   * Requirements: 3.4
   */
  @Get()
  async getDepartments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('businessId') businessId?: string,
  ): Promise<DepartmentListResponseDto> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.departmentService.findAll(pageNum, limitNum, businessId);
  }

  /**
   * Get department by ID with full details
   * GET /departments/:id
   * Requirements: 3.4
   */
  @Get(':id')
  async getDepartment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.findByIdWithDetails(id);
  }

  /**
   * Update department
   * PUT /departments/:id
   * Requirements: 3.2
   */
  @Put(':id')
  async updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  /**
   * Delete department
   * DELETE /departments/:id
   * Requirements: 3.5
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDepartment(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.departmentService.delete(id);
  }

  /**
   * Assign an entity to a department
   * POST /departments/:departmentId/entities
   */
  @ApiOperation({
    summary: 'Assign entity to department',
    description: 'Assigns a business entity to a department with optional primary designation.',
  })
  @ApiParam({
    name: 'departmentId',
    description: 'Department UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: AssignEntityDto,
    description: 'Entity assignment data',
  })
  @ApiResponse({
    status: 201,
    description: 'Entity assigned successfully',
    type: DepartmentEntityResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Department or entity not found',
  })
  @ApiConflictResponse({
    description: 'Entity already assigned to this department',
  })
  @Post(':departmentId/entities')
  async assignEntity(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() assignEntityDto: AssignEntityDto,
  ): Promise<DepartmentEntityResponseDto> {
    const assignment = await this.departmentService.assignEntityToDepartment(
      departmentId,
      assignEntityDto.entityId,
      assignEntityDto.isPrimary,
    );

    return {
      id: assignment.id,
      departmentId: assignment.departmentId,
      entityId: assignment.entityId,
      isPrimary: assignment.isPrimary,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }

  /**
   * Set an entity as primary for a department
   * POST /departments/:departmentId/entities/:entityId/set-primary
   */
  @Post(':departmentId/entities/:entityId/set-primary')
  @HttpCode(HttpStatus.OK)
  async setPrimaryEntity(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<DepartmentEntityResponseDto> {
    const assignment = await this.departmentService.setPrimaryEntity(departmentId, entityId);

    return {
      id: assignment.id,
      departmentId: assignment.departmentId,
      entityId: assignment.entityId,
      isPrimary: assignment.isPrimary,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }

  /**
   * Get all entities assigned to a department
   * GET /departments/:departmentId/entities
   */
  @Get(':departmentId/entities')
  async getDepartmentEntities(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentEntityResponseDto[]> {
    const assignments = await this.departmentService.getDepartmentEntities(departmentId);

    return assignments.map(assignment => ({
      id: assignment.id,
      departmentId: assignment.departmentId,
      entityId: assignment.entityId,
      isPrimary: assignment.isPrimary,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      entity: assignment.entity ? {
        id: assignment.entity.id,
        name: assignment.entity.name,
        kahaId: assignment.entity.kahaId,
        address: assignment.entity.address,
        radiusMeters: assignment.entity.radiusMeters,
      } : undefined,
    }));
  }

  /**
   * Remove entity assignment from department
   * DELETE /departments/:departmentId/entities/:entityId
   */
  @Delete(':departmentId/entities/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEntityAssignment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<void> {
    await this.departmentService.removeEntityAssignment(departmentId, entityId);
  }

  /**
   * Get department entities with details
   * GET /departments/:departmentId/entities-details
   * Requirements: 7.4
   */
  @Get(':departmentId/entities-details')
  async getDepartmentWithEntities(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.getDepartmentWithEntities(departmentId);
  }
}