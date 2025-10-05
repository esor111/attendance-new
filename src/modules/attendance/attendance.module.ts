import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './controllers/attendance.controller';
import { EntityAccessController } from './controllers/entity-access.controller';
import { ReportingController } from './controllers/reporting.controller';
import { AttendanceService } from './services/attendance.service';
import { GeospatialService } from './services/geospatial.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { TransactionManagerService } from './services/transaction-manager.service';
import { AttendanceValidationService } from './services/attendance-validation.service';
import { EntityAccessService } from './services/entity-access.service';
import { ReportingService } from './services/reporting.service';
import { DailyAttendance } from './entities/daily-attendance.entity';
import { AttendanceSession } from './entities/attendance-session.entity';
import { LocationLog } from './entities/location-log.entity';
import { UserEntityAssignment } from './entities/user-entity-assignment.entity';
import { ReportingStructure } from './entities/reporting-structure.entity';
import { DailyAttendanceRepository } from './repositories/daily-attendance.repository';
import { AttendanceSessionRepository } from './repositories/attendance-session.repository';
import { LocationLogRepository } from './repositories/location-log.repository';
import { UserEntityAssignmentRepository } from './repositories/user-entity-assignment.repository';
import { ReportingStructureRepository } from './repositories/reporting-structure.repository';
import { UserModule } from '../user/user.module';
import { EntityModule } from '../entity/entity.module';
import { DepartmentModule } from '../department/department.module';
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
      ReportingStructure,
      // Add entities needed by GeospatialService
      User,
      BusinessEntity,
      DepartmentEntityAssignment,
    ]),
    UserModule,
    EntityModule,
    DepartmentModule,
  ],
  controllers: [AttendanceController, EntityAccessController, ReportingController],
  providers: [
    AttendanceService,
    GeospatialService,
    FraudDetectionService,
    TransactionManagerService,
    AttendanceValidationService,
    EntityAccessService,
    ReportingService,
    DailyAttendanceRepository,
    AttendanceSessionRepository,
    LocationLogRepository,
    UserEntityAssignmentRepository,
    ReportingStructureRepository,
  ],
  exports: [
    AttendanceService,
    GeospatialService,
    FraudDetectionService,
    TransactionManagerService,
    AttendanceValidationService,
    EntityAccessService,
    ReportingService,
    DailyAttendanceRepository,
    AttendanceSessionRepository,
    LocationLogRepository,
    UserEntityAssignmentRepository,
    ReportingStructureRepository,
  ],
})
export class AttendanceModule {}