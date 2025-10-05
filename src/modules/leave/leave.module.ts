import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveController } from './controllers/leave.controller';
import { LeaveService } from './services/leave.service';
import { LeaveApprovalService } from './services/leave-approval.service';
import { LeaveBalanceService } from './services/leave-balance.service';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { LeaveTypeRepository } from './repositories/leave-type.repository';
import { LeaveRequestRepository } from './repositories/leave-request.repository';
import { LeaveBalanceRepository } from './repositories/leave-balance.repository';
import { UserModule } from '../user/user.module';
import { AttendanceModule } from '../attendance/attendance.module';
// Import entities needed by services
import { User } from '../user/entities/user.entity';

/**
 * Leave Module - Complete leave management functionality
 * Handles leave types, requests, approvals, and balance management
 * Integrates with user management and reporting structure
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveType,
      LeaveRequest,
      LeaveBalance,
      // Add entities needed by services
      User,
    ]),
    UserModule,
    AttendanceModule, // For reporting structure access
  ],
  controllers: [LeaveController],
  providers: [
    LeaveService,
    LeaveApprovalService,
    LeaveBalanceService,
    LeaveTypeRepository,
    LeaveRequestRepository,
    LeaveBalanceRepository,
  ],
  exports: [
    LeaveService,
    LeaveApprovalService,
    LeaveBalanceService,
    LeaveTypeRepository,
    LeaveRequestRepository,
    LeaveBalanceRepository,
  ],
})
export class LeaveModule {}