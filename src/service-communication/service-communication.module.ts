import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessService } from './services/business.service';
import { UserService } from './services/user.service';
import { HandshakeService } from './services/handshake.service';
import { User } from '../modules/user/entities/user.entity';
import { Department } from '../modules/department/entities/department.entity';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([User, Department]),
  ],
  providers: [
    BusinessService,
    UserService,
    HandshakeService,
  ],
  exports: [
    BusinessService,
    UserService,
    HandshakeService,
  ],
})
export class ServiceCommunicationModule {}