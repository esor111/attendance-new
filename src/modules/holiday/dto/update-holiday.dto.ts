import { PartialType } from '@nestjs/mapped-types';
import { CreateHolidayDto } from './create-holiday.dto';

/**
 * Update Holiday DTO - Validates holiday update requests
 * Extends CreateHolidayDto with partial validation for updates
 * All fields are optional for flexible holiday modifications
 */
export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}