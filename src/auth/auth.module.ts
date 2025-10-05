import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtTokenModule } from './jwt-token.module';
import { ServiceCommunicationModule } from '../service-communication/service-communication.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BusinessAuthGuard } from './guards/business-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtTokenModule,
    ServiceCommunicationModule,
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    BusinessAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    JwtTokenModule,
    JwtAuthGuard,
    BusinessAuthGuard,
    OptionalJwtAuthGuard,
    PassportModule,
  ],
})
export class AuthModule {}