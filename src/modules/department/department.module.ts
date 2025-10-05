import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';
import { DepartmentEntityAssignment } from './entities/department-entity-assignment.entity';
import { Entity } from '../entity/entities/entity.entity';

/**
 * Department Module - Handles department management and entity assignments
 * Manages organizational structure within businesses
 */
@Module({
  imports: [TypeOrmModule.forFeature([Department, DepartmentEntityAssignment, Entity])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService], // Export for use in other modules
})
export class DepartmentModule {}