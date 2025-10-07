import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConsolidateRequestsMigration } from '../migrations/consolidate-requests-migration';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

/**
 * Migration Controller - Handles data migration operations
 * Provides endpoints to execute and monitor the request consolidation migration
 * Should be used by administrators only
 */
@ApiTags('Data Migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/migration')
export class MigrationController {
  constructor(
    private readonly consolidateRequestsMigration: ConsolidateRequestsMigration,
  ) {}

  /**
   * Execute the request consolidation migration
   */
  @Post('consolidate-requests')
  @ApiOperation({
    summary: 'Execute request consolidation migration',
    description: 'Migrate data from separate request tables to unified request table',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration executed successfully',
    schema: {
      example: {
        success: true,
        migratedCounts: {
          attendanceRequests: 150,
          remoteWorkRequests: 75,
          leaveRequests: 200,
          total: 425,
        },
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Migration failed' })
  async executeRequestConsolidation() {
    return await this.consolidateRequestsMigration.executeMigration();
  }

  /**
   * Get migration status
   */
  @Get('consolidate-requests/status')
  @ApiOperation({
    summary: 'Get migration status',
    description: 'Check the current status of the request consolidation migration',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration status retrieved successfully',
    schema: {
      example: {
        originalCounts: {
          attendanceRequests: 150,
          remoteWorkRequests: 75,
          leaveRequests: 200,
          total: 425,
        },
        migratedCounts: {
          attendanceRequests: 150,
          remoteWorkRequests: 75,
          leaveRequests: 200,
          total: 425,
        },
        migrationComplete: true,
      },
    },
  })
  async getMigrationStatus() {
    return await this.consolidateRequestsMigration.getMigrationStatus();
  }

  /**
   * Rollback migration (for testing or emergency)
   */
  @Post('consolidate-requests/rollback')
  @ApiOperation({
    summary: 'Rollback request consolidation migration',
    description: 'Rollback the request consolidation migration (removes migrated data)',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration rollback executed successfully',
    schema: {
      example: {
        success: true,
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Migration rollback failed' })
  async rollbackRequestConsolidation() {
    return await this.consolidateRequestsMigration.rollbackMigration();
  }
}