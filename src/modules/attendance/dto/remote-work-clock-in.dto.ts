import { IsString, MaxLength } from 'class-validator';
import { ClockInDto } from './clock-in.dto';

/**
 * DTO for remote work clock-in operations
 * Extends ClockInDto with required remote location field
 */
export class RemoteWorkClockInDto extends ClockInDto {
  @IsString({ message: 'Remote location must be a string' })
  @MaxLength(255, { message: 'Remote location cannot exceed 255 characters' })
  remoteLocation: string;
}