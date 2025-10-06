import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { DepartmentScheduleController } from './controllers/department-schedule.controller';
import { DepartmentScheduleService } from './services/department-schedule.service';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { DepartmentSchedule } from './entities/department-schedule.entity';
import { DepartmentRepository } from './repositories/department.repository';
import { DepartmentScheduleRepository } from './repositories/department-schedule.repository';
import { Entity } from '../entity/entities/entity.entity';

/**
 * Department Module - Handles department management and entity assignments
 * Manages organizational structure within businesses
 */
@Module({
  imports: [TypeOrmModule.forFeature([Department, DepartmentEntityAssignment, DepartmentSchedule, Entity])],
  controllers: [DepartmentController, DepartmentScheduleController],
  providers: [
    DepartmentService,
    DepartmentScheduleService,
    DepartmentRepository,
    DepartmentScheduleRepository,
  ],
  exports: [
    DepartmentService,
    DepartmentScheduleService,
    DepartmentRepository,
    DepartmentScheduleRepository,
  ], // Export for use in other modules
})
export class DepartmentModule {}