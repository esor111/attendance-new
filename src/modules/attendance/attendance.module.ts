import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './controllers/attendance.controller';
import { EntityAccessController } from './controllers/entity-access.controller';
import { RemoteWorkController } from './controllers/remote-work.controller';
import { AttendanceRequestController } from './controllers/attendance-request.controller';
import { UserScheduleController } from './controllers/user-schedule.controller';
import { RequestController } from './controllers/request.controller';
import { MigrationController } from './controllers/migration.controller';
import { AttendanceService } from './services/attendance.service';
import { GeospatialService } from './services/geospatial.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { TransactionManagerService } from './services/transaction-manager.service';
import { AttendanceValidationService } from './services/attendance-validation.service';
import { EntityAccessService } from './services/entity-access.service';
import { RemoteWorkService } from './services/remote-work.service';
import { AttendanceRequestService } from './services/attendance-request.service';
import { RequestService } from './services/request.service';
import { ConsolidateRequestsMigration } from './migrations/consolidate-requests-migration';
import { DailyAttendance } from './entities/daily-attendance.entity';
import { AttendanceSession } from './entities/attendance-session.entity';
import { LocationLog } from './entities/location-log.entity';
import { UserEntityAssignment } from './entities/user-entity-assignment.entity';
import { RemoteWorkRequest } from './entities/remote-work-request.entity';
import { AttendanceRequest } from './entities/attendance-request.entity';
import { Request } from './entities/request.entity';
import { DailyAttendanceRepository } from './repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from './repositories/attendance-session.repository';
import { LocationLogRepository } from './repositories/location-log.repository';
import { UserEntityAssignmentRepository } from './repositories/user-entity-assignment.repository';
import { RemoteWorkRequestRepository } from './repositories/remote-work-request.repository';
import { AttendanceRequestRepository } from './repositories/attendance-request.repository';
import { RequestRepository } from './repositories/request.repository';
// Import LeaveRequest for migration
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { UserModule } from '../user/user.module';
import { EntityModule } from '../entity/entity.module';
import { DepartmentModule } from '../department/department.module';
import { HolidayModule } from '../holiday/holiday.module';
// Import entities needed by GeospatialService
import { User } from '../user/entities/user.entity';
import { Entity as BusinessEntity } from '../entity/entities/entity.entity';
import { DepartmentEntityAssignment } from '../department/entities/department-entity-assignment.entity';

/**
 * Attendance Module - Core attendance functionality
 * Handles daily attendance, sessions, location logs, and reporting
 * Integrates with geospatial services and fraud detection
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyAttendance,
      AttendanceSession,
      LocationLog,
      UserEntityAssignment,
      RemoteWorkRequest,
      AttendanceRequest,
      Request, // New unified request entity
      LeaveRequest, // Needed for migration
      // Add entities needed by GeospatialService
      User,
      BusinessEntity,
      DepartmentEntityAssignment,
    ]),
    UserModule,
    EntityModule,
    DepartmentModule,
    HolidayModule,
  ],
  controllers: [
    AttendanceController, 
    EntityAccessController, 
    RemoteWorkController, 
    AttendanceRequestController, 
    UserScheduleController,
    RequestController, // New unified request controller
    MigrationController, // Migration controller for data consolidation
  ],
  providers: [
    AttendanceService,
    GeospatialService,
    FraudDetectionService,
    TransactionManagerService,
    AttendanceValidationService,
    EntityAccessService,
    RemoteWorkService,
    AttendanceRequestService,
    RequestService, // New unified request service
    DailyAttendanceRepository,
    AttendanceSessionRepository,
    LocationLogRepository,
    UserEntityAssignmentRepository,
    RemoteWorkRequestRepository,
    AttendanceRequestRepository,
    RequestRepository, // New unified request repository
    ConsolidateRequestsMigration, // Migration service
  ],
  exports: [
    AttendanceService,
    GeospatialService,
    FraudDetectionService,
    TransactionManagerService,
    AttendanceValidationService,
    EntityAccessService,
    RemoteWorkService,
    AttendanceRequestService,
    RequestService, // New unified request service
    DailyAttendanceRepository,
    AttendanceSessionRepository,
    LocationLogRepository,
    UserEntityAssignmentRepository,
    RemoteWorkRequestRepository,
    AttendanceRequestRepository,
    RequestRepository, // New unified request repository
  ],
})
export class AttendanceModule {}