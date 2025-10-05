import { IsUUID, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Reporting Structure DTO - Validates new employee-manager relationship creation
 * Defines the structure for creating reporting relationships with time bounds
 */
export class CreateReportingStructureDto {
  @IsUUID(4, { message: 'EmployeeId must be a valid UUID' })
  employeeId: string;

  @IsUUID(4, { message: 'ManagerId must be a valid UUID' })
  managerId: string;

  @IsDate({ message: 'Start date must be a valid date' })
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate({ message: 'End date must be a valid date' })
  @Type(() => Date)
  endDate?: Date;
}