import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { HolidayService } from '../services/holiday.service';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { HolidayQueryDto } from '../dto/holiday-query.dto';
import { Holiday } from '../entities/holiday.entity';

/**
 * Holiday Controller - Handles HTTP requests for holiday management
 * Provides endpoints for CRUD operations and holiday queries using real-time calculation
 * Includes admin-only endpoints for holiday creation and management
 */
@Controller('api/holidays')
@UseGuards(JwtAuthGuard)
export class HolidayController {
  constructor(
    private readonly holidayService: HolidayService,
  ) {}

  /**
   * Create a new holiday (admin only)
   * POST /api/holidays
   */
  @Post()
  async createHoliday(@Body() createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    return this.holidayService.createHoliday(createHolidayDto);
  }

  /**
   * Get holidays with optional filtering
   * GET /api/holidays
   */
  @Get()
  async getHolidays(@Query() queryDto: HolidayQueryDto): Promise<Holiday[]> {
    return this.holidayService.getHolidays(queryDto);
  }

  /**
   * Get holiday by ID
   * GET /api/holidays/:id
   */
  @Get(':id')
  async getHolidayById(@Param('id', ParseUUIDPipe) id: string): Promise<Holiday> {
    return this.holidayService.findHolidayById(id);
  }

  /**
   * Update a holiday (admin only)
   * PUT /api/holidays/:id
   */
  @Put(':id')
  async updateHoliday(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ): Promise<Holiday> {
    return this.holidayService.updateHoliday(id, updateHolidayDto);
  }

  /**
   * Delete a holiday (admin only)
   * DELETE /api/holidays/:id
   */
  @Delete(':id')
  async deleteHoliday(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.holidayService.deleteHoliday(id);
    return { message: 'Holiday deleted successfully' };
  }

  /**
   * Get yearly holiday calendar using real-time calculation
   * GET /api/holidays/year/:year
   */
  @Get('year/:year')
  async getYearlyHolidays(
    @Param('year', ParseIntPipe) year: number,
    @Query('departmentId') departmentId?: string,
  ): Promise<Array<Holiday & { actualDate: Date }>> {
    return this.holidayService.getHolidaysForYear(year, departmentId);
  }

  /**
   * Check if a specific date is a holiday
   * GET /api/holidays/check/:date
   */
  @Get('check/:date')
  async checkHolidayDate(
    @Param('date') date: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<{ isHoliday: boolean; holidays: Holiday[] }> {
    const checkDate = new Date(date);
    const isHoliday = await this.holidayService.isHoliday(checkDate, departmentId);
    const holidays = await this.holidayService.getHolidaysByDate(checkDate, departmentId);

    return {
      isHoliday,
      holidays,
    };
  }
}