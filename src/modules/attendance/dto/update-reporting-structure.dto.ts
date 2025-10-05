import { IsUUID, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update Reporting Structure DTO - Validates reporting relationship updates
 * Allows partial updates to existing employee-manager relationships
 */
export class UpdateReportingStructureDto {
  @IsOptional()
  @IsUUID(4, { message: 'ManagerId must be a valid UUID' })
  managerId?: string;

  @IsOptional()
  @IsDate({ message: 'Start date must be a valid date' })
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate({ message: 'End date must be a valid date' })
  @Type(() => Date)
  endDate?: Date;
}