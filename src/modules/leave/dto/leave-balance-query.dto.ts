import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for querying leave balances
 * Includes optional year filter for historical balance data
 */
export class LeaveBalanceQueryDto {
  @IsOptional()
  @IsNumber({}, { message: 'Year must be a number' })
  @Min(2020, { message: 'Year must be 2020 or later' })
  @Max(2050, { message: 'Year must be 2050 or earlier' })
  @Transform(({ value }) => parseInt(value))
  year?: number;
}