import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveController } from './controllers/leave.controller';
import { LeaveService } from './services/leave.service';
import { LeaveRequest } from './entities/leave-request.entity';
import { UserModule } from '../user/user.module';
import { AttendanceModule } from '../attendance/attendance.module';
// Import entities needed by services
import { User } from '../user/entities/user.entity';

/**
 * Simplified Leave Module - Consolidated leave management functionality
 * Handles leave requests, approvals, and balance management in a single service
 * Eliminates complex relationships and reduces maintenance overhead
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequest,
      // Add entities needed by services
      User,
    ]),
    UserModule,
    AttendanceModule, // For reporting structure access
  ],
  controllers: [LeaveController],
  providers: [
    LeaveService,
  ],
  exports: [
    LeaveService,
  ],
})
export class LeaveModule {}