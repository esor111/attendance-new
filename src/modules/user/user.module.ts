import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { ServiceCommunicationModule } from '../../service-communication/service-communication.module';
import { DepartmentModule } from '../department/department.module';

/**
 * User Module - Handles user management and profile operations
 * Integrates with handshake process for external user data population
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ServiceCommunicationModule,
    DepartmentModule, // Import to access DepartmentService
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export for use in other modules
})
export class UserModule {}