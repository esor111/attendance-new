import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ServiceCommunicationModule } from './service-communication/service-communication.module';
import { UserModule } from './modules/user/user.module';
import { DepartmentModule } from './modules/department/department.module';
import { EntityModule } from './modules/entity/entity.module';
import { getDatabaseConfig } from './config/database.config';

/**
 * Main Application Module
 * Configures TypeORM with PostGIS support and imports all feature modules
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
