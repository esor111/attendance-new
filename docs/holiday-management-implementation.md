# Holiday Management System Implementation

## Overview

The Holiday Management System provides comprehensive holiday functionality for the attendance microservice. It prevents attendance operations on holidays, supports different holiday types (national, company, department), and includes automatic calendar generation with recurring holiday support.

## Features Implemented

### 1. Holiday Entity Management
- **Holiday Entity**: Supports name, date, type, recurrence, and department association
- **Holiday Types**: NATIONAL, COMPANY, DEPARTMENT
- **Recurrence Types**: NONE, YEARLY, MONTHLY
- **Department-specific holidays**: Optional department association for targeted holidays

### 2. Holiday Calendar System
- **HolidayCalendar Entity**: Associates holidays with specific years and departments
- **Automatic Calendar Generation**: Creates yearly calendars with recurring holiday processing
- **Department Filtering**: Supports department-specific holiday calendars

### 3. Attendance Integration
- **Holiday Validation**: Prevents clock-in/out operations on holidays
- **Attendance Validation Service**: Integrated holiday checking in all attendance operations
- **Reporting Integration**: Excludes holidays from attendance calculations and statistics

### 4. REST API Endpoints

#### Holiday Management
- `POST /api/holidays` - Create new holiday (admin only)
- `GET /api/holidays` - Get holidays with filtering (date range, type, department)
- `GET /api/holidays/:id` - Get specific holiday
- `PUT /api/holidays/:id` - Update holiday (admin only)
- `DELETE /api/holidays/:id` - Delete holiday (admin only)

#### Calendar Operations
- `GET /api/holidays/calendar/:year` - Get yearly holiday calendar
- `POST /api/holidays/calendar/:year/generate` - Generate calendar for year (admin only)

#### Holiday Checking
- `GET /api/holidays/check/:date` - Check if specific date is a holiday

### 5. Business Logic Features

#### Holiday Validation
- **Conflict Detection**: Prevents duplicate holidays on same date
- **Department Requirements**: Enforces department ID for department-specific holidays
- **Type Validation**: Ensures proper holiday type and department association

#### Calendar Generation
- **Yearly Recurrence**: Automatically generates yearly recurring holidays
- **Monthly Recurrence**: Supports monthly recurring holidays
- **Leap Year Handling**: Properly handles February 29th in non-leap years
- **Department Association**: Links calendar entries to appropriate departments

#### Attendance Prevention
- **Clock-in Prevention**: Blocks daily attendance start on holidays
- **Remote Work Prevention**: Blocks remote work clock-in on holidays
- **User-friendly Messages**: Provides clear error messages with holiday names

## Database Schema

### Holiday Table
```sql
CREATE TABLE holidays (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    type ENUM('NATIONAL', 'COMPANY', 'DEPARTMENT') DEFAULT 'COMPANY',
    recurrence ENUM('NONE', 'YEARLY', 'MONTHLY') DEFAULT 'NONE',
    department_id UUID REFERENCES departments(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Holiday Calendar Table
```sql
CREATE TABLE holiday_calendars (
    id UUID PRIMARY KEY,
    holiday_id UUID REFERENCES holidays(id) NOT NULL,
    year INTEGER NOT NULL,
    department_id UUID REFERENCES departments(id),
    actual_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(holiday_id, year, department_id)
);
```

## Usage Examples

### Creating Holidays

#### National Holiday
```typescript
const nationalHoliday = {
  name: "Independence Day",
  date: "2025-07-04",
  type: HolidayType.NATIONAL,
  recurrence: RecurrenceType.YEARLY,
  description: "National Independence Day"
};
```

#### Department-specific Holiday
```typescript
const departmentHoliday = {
  name: "Engineering Day",
  date: "2025-09-15",
  type: HolidayType.DEPARTMENT,
  departmentId: "engineering-dept-uuid",
  recurrence: RecurrenceType.YEARLY,
  description: "Annual Engineering Department celebration"
};
```

### Checking Holidays
```typescript
// Check if date is a holiday
const isHoliday = await holidayService.isHoliday(new Date('2025-01-01'));

// Get holidays for a date with department context
const holidays = await holidayService.getHolidaysByDate(
  new Date('2025-01-01'), 
  'dept-uuid'
);
```

### Calendar Generation
```typescript
// Generate calendar for 2025
const calendar = await holidayCalendarService.generateCalendarForYear(2025);

// Get department-specific calendar
const deptCalendar = await holidayCalendarService.getCalendarForYear(
  2025, 
  'dept-uuid'
);
```

## Integration Points

### 1. Attendance Validation
The `AttendanceValidationService` now includes holiday checking:
- Validates all clock-in operations against holidays
- Validates remote work clock-in operations against holidays
- Provides clear error messages with holiday names

### 2. Reporting Service
The `ReportingService` integrates with holidays for accurate reporting:
- Excludes holidays from working day calculations
- Provides holiday context in attendance reports
- Calculates attendance statistics excluding holiday periods

### 3. Module Integration
- **AttendanceModule**: Imports HolidayModule for validation services
- **AppModule**: Includes HolidayModule in main application
- **Database**: Holiday entities are included in TypeORM configuration

## Error Handling

### Holiday-specific Exceptions
- **Conflict Detection**: Clear messages about existing holidays on same date
- **Validation Errors**: Specific messages for department requirements
- **Attendance Prevention**: User-friendly messages explaining holiday restrictions

### Example Error Response
```json
{
  "statusCode": 409,
  "message": "Attendance operations are not allowed on holidays: New Year's Day",
  "error": "Invalid Attendance State",
  "details": {
    "currentState": "holiday_attendance_not_allowed",
    "attemptedAction": "clock-in",
    "userId": "user-uuid",
    "suggestions": [
      "Attendance operations are not permitted on holidays",
      "Contact your manager if you need to work on a holiday"
    ]
  }
}
```

## Testing

### Unit Tests
- **HolidayService**: Tests for CRUD operations, validation, and business logic
- **HolidayController**: Tests for API endpoints and request handling
- **Calendar Generation**: Tests for recurring holiday logic and edge cases

### Integration Tests
- **Attendance Integration**: Tests holiday prevention in attendance operations
- **Calendar Generation**: Tests automatic calendar creation and department filtering
- **API Integration**: End-to-end tests for holiday management workflows

## Seed Data

The system includes seed data for common holidays:
- National holidays (Nepal-specific)
- Company holidays (foundation day, retreats)
- Festival holidays (Dashain, Tihar, Holi)
- International holidays (New Year, Christmas)

## Performance Considerations

### Database Optimization
- **Indexes**: Date-based indexes for efficient holiday lookups
- **Caching**: Holiday data can be cached for frequently accessed dates
- **Query Optimization**: Efficient queries for date range and department filtering

### Calendar Generation
- **Batch Processing**: Generates entire year calendars in single operations
- **Conflict Avoidance**: Prevents duplicate calendar generation
- **Lazy Loading**: Generates calendars on-demand when requested

## Security Considerations

### Access Control
- **Admin Operations**: Holiday creation/modification restricted to admin users
- **Department Filtering**: Users only see relevant holidays for their department
- **Audit Trail**: All holiday operations are logged with timestamps

### Data Validation
- **Input Validation**: Comprehensive validation for all holiday data
- **Business Rules**: Enforces proper holiday type and department associations
- **Conflict Prevention**: Prevents overlapping holidays and circular dependencies

## Future Enhancements

### Potential Improvements
1. **Lunar Calendar Support**: Integration with lunar calendar for festival dates
2. **Holiday Templates**: Pre-defined holiday sets for different regions/cultures
3. **Approval Workflow**: Multi-level approval for holiday creation/modification
4. **Notification System**: Alerts for upcoming holidays and calendar changes
5. **Import/Export**: Bulk holiday import from external calendar systems
6. **Holiday Policies**: Configurable rules for holiday behavior and exceptions

### Scalability Considerations
1. **Multi-tenant Support**: Holiday isolation by business/organization
2. **Regional Variations**: Support for different holiday sets by geographic region
3. **Performance Optimization**: Advanced caching and query optimization
4. **API Rate Limiting**: Protection against excessive holiday lookup requests

## Conclusion

The Holiday Management System provides a robust foundation for holiday handling in the attendance microservice. It successfully integrates with existing attendance operations, provides comprehensive API endpoints, and includes proper validation and error handling. The system is designed to be extensible and can accommodate future enhancements as business requirements evolve.