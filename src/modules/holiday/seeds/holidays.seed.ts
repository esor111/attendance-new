import { DataSource } from 'typeorm';
import { Holiday, HolidayType, RecurrenceType } from '../entities/holiday.entity';

/**
 * Holiday Seed Data - Creates default holidays for the system
 * Includes common national and company holidays with yearly recurrence
 * Can be extended with department-specific holidays as needed
 */
export async function seedHolidays(dataSource: DataSource): Promise<void> {
  const holidayRepository = dataSource.getRepository(Holiday);

  // Check if holidays already exist
  const existingHolidays = await holidayRepository.count();
  if (existingHolidays > 0) {
    console.log('Holidays already seeded, skipping...');
    return;
  }

  const holidays = [
    // National Holidays (Nepal)
    {
      name: 'New Year\'s Day',
      date: new Date('2025-01-01'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'International New Year celebration',
      isActive: true,
    },
    {
      name: 'Prithvi Jayanti',
      date: new Date('2025-01-11'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'Birth anniversary of King Prithvi Narayan Shah',
      isActive: true,
    },
    {
      name: 'Martyrs\' Day',
      date: new Date('2025-01-30'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'Shahid Diwas - Democracy Day',
      isActive: true,
    },
    {
      name: 'International Women\'s Day',
      date: new Date('2025-03-08'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'International Women\'s Day',
      isActive: true,
    },
    {
      name: 'Labor Day',
      date: new Date('2025-05-01'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'International Workers\' Day',
      isActive: true,
    },
    {
      name: 'Buddha Jayanti',
      date: new Date('2025-05-12'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'Birth anniversary of Lord Buddha',
      isActive: true,
    },
    {
      name: 'Republic Day',
      date: new Date('2025-05-29'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'Nepal Republic Day',
      isActive: true,
    },
    {
      name: 'Constitution Day',
      date: new Date('2025-09-20'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.YEARLY,
      description: 'Nepal Constitution Day',
      isActive: true,
    },

    // Company Holidays
    {
      name: 'Company Foundation Day',
      date: new Date('2025-04-15'),
      type: HolidayType.COMPANY,
      recurrence: RecurrenceType.YEARLY,
      description: 'Annual company foundation celebration',
      isActive: true,
    },
    {
      name: 'Annual Company Retreat',
      date: new Date('2025-11-15'),
      type: HolidayType.COMPANY,
      recurrence: RecurrenceType.YEARLY,
      description: 'Company-wide retreat and team building',
      isActive: true,
    },
    {
      name: 'Christmas Day',
      date: new Date('2025-12-25'),
      type: HolidayType.COMPANY,
      recurrence: RecurrenceType.YEARLY,
      description: 'Christmas celebration',
      isActive: true,
    },
    {
      name: 'New Year\'s Eve',
      date: new Date('2025-12-31'),
      type: HolidayType.COMPANY,
      recurrence: RecurrenceType.YEARLY,
      description: 'New Year\'s Eve celebration',
      isActive: true,
    },

    // Festival Holidays (These would typically be calculated based on lunar calendar)
    {
      name: 'Dashain Festival',
      date: new Date('2025-10-02'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.NONE, // Lunar calendar dates change yearly
      description: 'Major Hindu festival - Dashain',
      isActive: true,
    },
    {
      name: 'Tihar Festival',
      date: new Date('2025-10-20'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.NONE, // Lunar calendar dates change yearly
      description: 'Festival of Lights - Tihar',
      isActive: true,
    },
    {
      name: 'Holi Festival',
      date: new Date('2025-03-14'),
      type: HolidayType.NATIONAL,
      recurrence: RecurrenceType.NONE, // Lunar calendar dates change yearly
      description: 'Festival of Colors - Holi',
      isActive: true,
    },
  ];

  try {
    const savedHolidays = await holidayRepository.save(holidays);
    console.log(`Successfully seeded ${savedHolidays.length} holidays`);
  } catch (error) {
    console.error('Error seeding holidays:', error);
    throw error;
  }
}

/**
 * Remove all holidays (for testing or reset purposes)
 */
export async function clearHolidays(dataSource: DataSource): Promise<void> {
  const holidayRepository = dataSource.getRepository(Holiday);
  await holidayRepository.clear();
  console.log('All holidays cleared');
}