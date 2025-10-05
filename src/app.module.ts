import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ServiceCommunicationModule } from './service-communication/service-communication.module';
import { UserModule } from './modules/user/user.module';
import { DepartmentModule } from './modules/department/department.module';
import { EntityModule } from './modules/entity/entity.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { HolidayModule } from './modules/holiday/holiday.module';
import { getDatabaseConfig } from './config/database.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { EnhancedValidationPipe } from './common/pipes/validation.pipe';
import { ValidationService } from './common/services/validation.service';

/**
 * Main Application Module
 * Configures TypeORM with PostGIS support and imports all feature modules
 * Includes global error handling and validation
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    ServiceCommunicationModule,
    UserModule,
    DepartmentModule,
    EntityModule,
    AttendanceModule,
    LeaveModule,
    HolidayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ValidationService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: EnhancedValidationPipe,
    },
  ],
})
export class AppModule {}
