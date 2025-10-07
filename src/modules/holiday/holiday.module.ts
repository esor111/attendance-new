import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holiday } from './entities/holiday.entity';
import { HolidayRepository } from './repositories/holiday.repository';
import { HolidayService } from './services/holiday.service';
import { HolidayController } from './controllers/holiday.controller';

/**
 * Holiday Module - Manages holiday functionality for the attendance system
 * Provides holiday management and date validation services using real-time calculation
 * Integrates with attendance operations to prevent work on holidays
 */
@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  controllers: [HolidayController],
  providers: [
    HolidayRepository,
    HolidayService,
  ],
  exports: [HolidayService],
})
export class HolidayModule {}