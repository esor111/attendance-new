import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holiday } from './entities/holiday.entity';
import { HolidayCalendar } from './entities/holiday-calendar.entity';
import { HolidayRepository } from './repositories/holiday.repository';
import { HolidayCalendarRepository } from './repositories/holiday-calendar.repository';
import { HolidayService } from './services/holiday.service';
import { HolidayCalendarService } from './services/holiday-calendar.service';
import { HolidayController } from './controllers/holiday.controller';

/**
 * Holiday Module - Manages holiday functionality for the attendance system
 * Provides holiday management, calendar generation, and date validation services
 * Integrates with attendance operations to prevent work on holidays
 */
@Module({
  imports: [TypeOrmModule.forFeature([Holiday, HolidayCalendar])],
  controllers: [HolidayController],
  providers: [
    HolidayRepository,
    HolidayCalendarRepository,
    HolidayService,
    HolidayCalendarService,
  ],
  exports: [HolidayService, HolidayCalendarService],
})
export class HolidayModule {}