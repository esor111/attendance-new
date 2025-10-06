# Implementation Plan

- [x] 1. Create core infrastructure and data models





  - Create base attendance module structure with proper imports and exports
  - Implement geospatial service with Haversine distance calculations and PostGIS integration
  - Create fraud detection service with travel speed analysis algorithms
  - Set up shared DTOs and interfaces for attendance operations
  - Create DailyAttendance entity with proper TypeORM decorations and relationships
  - Create AttendanceSession entity for break management with session type validation
  - Create LocationLog entity for field worker client site visits
  - Create UserEntityAssignment entity with user-entity relationships and primary designation
  - Create ReportingStructure entity with employee-manager relationships and date ranges
  - Implement all repositories with TypeORM for CRUD operations and custom queries
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 8.1, 8.2, 9.1, 9.3, 9.4_

- [x] 2. Implement entity access resolution and user assignment services




  - Create service to resolve authorized entities for users
  - Implement priority logic: user-specific assignments override department assignments
  - Add method to combine user and department entity assignments
  - Create validation for entity access permissions
  - Add method to check if user has access to specific entity
  - Implement repository methods for user entity assignments
  - Add support for primary entity designation and unique constraints
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
- [x] 3. Implement core attendance services with clock-in/out and session management







- [ ] 3. Implement core attendance services with clock-in/out and session management

  - Implement clockIn method with location validation and entity assignment
  - Implement clockOut method with travel speed calculation and total hours
  - Add validation to prevent duplicate clock-ins and invalid clock-outs
  - Implement sessionCheckIn method with location and session type validation
  - Implement sessionCheckOut method with duration and travel speed calculation
  - Add validation to prevent overlapping sessions and require daily attendance
  - Integrate with geospatial service for location validation
  - Integrate fraud detection for session travel speed analysis
  - Add methods for finding today's attendance, attendance history, and active sessions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. Implement field worker location logging and reporting structure services





  - Implement locationCheckIn method for client site visits
  - Implement locationCheckOut method with visit duration calculation
  - Add validation for active daily attendance and entity access
  - Integrate travel speed analysis between different client locations
  - Implement method to get team members for a manager
  - Add team attendance summary with statistics (present, absent, late)
  - Create detailed attendance reports with location and flag information
  - Implement date range filtering and individual team member selection
  - Add validation to prevent circular reporting relationships
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.3, 8.4, 8.5, 8.6_

- [x] 5. Implement fraud detection and data integrity validation




  - Implement travel speed calculation and flagging (>200 km/h threshold)
  - Add location validation against entity radius requirements
  - Create pattern analysis for repeated suspicious behavior
  - Implement automatic flagging with detailed reason logging
  - Implement concurrent operation handling and race condition prevention
  - Add transaction management for complex attendance operations
  - Create referential integrity validation for user-entity relationships
  - Implement database constraint validation and meaningful error messages
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.2, 9.6, 9.7_

- [x] 6. Create comprehensive REST API controllers and endpoints






  - Create POST /api/attendance/clock-in endpoint with location validation
  - Create POST /api/attendance/clock-out endpoint with travel analysis
  - Add GET /api/attendance/today endpoint for current day status
  - Add GET /api/attendance/history endpoint with date range filtering
  - Create POST /api/attendance/session/check-in endpoint with session type support
  - Create POST /api/attendance/session/check-out endpoint with duration calculation
  - Add GET /api/attendance/session/current endpoint for active session status
  - Create POST /api/attendance/location/check-in endpoint for client visits
  - Create POST /api/attendance/location/check-out endpoint with visit tracking
  - Add GET /api/attendance/location/history endpoint for visit history
  - Create GET /api/attendance/team endpoint for team attendance summary
  - Add GET /api/attendance/team/:employeeId endpoint for individual reports
  - Create GET /api/attendance/flagged endpoint for suspicious activity reports
  - Add GET /api/attendance/analytics endpoint for attendance patterns
  - Implement proper authorization to ensure managers only access their team data
  - _Requirements: 1.1, 1.2, 1.4, 1.7, 3.1, 3.2, 3.3, 3.4, 3.8, 4.1, 4.2, 4.3, 4.4, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.4, 7.5_
-

- [x] 7. Implement comprehensive error handling, validation, and testing





  - Define specific exception classes for attendance, location, and fraud scenarios
  - Implement global exception filter with detailed error responses
  - Add validation for coordinates, entity access, and attendance states
  - Create user-friendly error messages with actionable suggestions
  - Implement comprehensive DTO validation with class-validator
  - Add coordinate range validation and format checking
  - Create business rule validation for attendance operations
  - Write unit tests for geospatial calculations with known coordinate sets
  - Test fraud detection algorithms with various speed scenarios
  - Test entity access resolution with different user configurations
  - Test attendance state management and validation rules
  - Test complete clock-in/out workflows with location validation
  - Test session management with multiple check-in/out cycles
  - Test field worker location logging with travel speed analysis
  - Test manager reporting access with team hierarchy validation
  - _Requirements: All error handling and testing requirements_

- [x] 8. Implement Leave Management System



  - Create LeaveType entity with name, max days per year, approval requirements, and carry forward rules
  - Create LeaveRequest entity with user, leave type, date range, status, and approval workflow
  - Create LeaveBalance entity with allocated, used, and remaining leave calculations
  - Implement LeaveService with request creation, approval workflow, and balance management
  - Implement LeaveApprovalService with manager approval logic and notification system
  - Implement LeaveBalanceService with automatic balance calculations and year-end processing
  - Create POST /api/leave/request endpoint for leave request submission
  - Create GET /api/leave/requests endpoint for user's leave request history
  - Create POST /api/leave/approve/:id endpoint for manager approval actions
  - Create GET /api/leave/team-requests endpoint for manager to view team leave requests
  - Create GET /api/leave/balance endpoint for user's current leave balances
  - Add validation for leave request conflicts, sufficient balance, and approval permissions
  - _Requirements: Leave management functionality_

- [x] 9. Implement Remote Work Management





  - Extend DailyAttendance entity with workLocation enum (OFFICE, REMOTE, FIELD)
  - Add remoteLocation, isRemoteApproved, and remoteApproverId fields to DailyAttendance
  - Create RemoteWorkRequest entity with user, requested date, reason, location, and approval status
  - Implement RemoteWorkService with request creation and approval workflow
  - Extend AttendanceService to handle remote work clock-in/out with different validation rules
  - Update FraudDetectionService to handle remote work patterns and location validation
  - Create POST /api/remote-work/request endpoint for remote work requests
  - Create GET /api/remote-work/requests endpoint for user's remote work history
  - Create POST /api/remote-work/approve/:id endpoint for manager approval
  - Create GET /api/remote-work/team-requests endpoint for manager team oversight
  - Update existing attendance endpoints to support remote work location tracking
  - Add validation for remote work policies, advance notice requirements, and approval limits
  - _Requirements: Remote work functionality_

- [x] 10. Implement Holiday Management System





  - Create Holiday entity with name, date, type (NATIONAL, COMPANY, DEPARTMENT), and recurrence
  - Create HolidayCalendar entity with year, department association, and holiday relationships
  - Implement HolidayService with holiday creation, calendar management, and date checking
  - Implement HolidayCalendarService with automatic calendar generation and department-specific holidays
  - Update AttendanceService to check holidays before allowing attendance operations
  - Create POST /api/holidays endpoint for holiday creation (admin only)
  - Create GET /api/holidays endpoint for holiday calendar retrieval with date range filtering
  - Create GET /api/holidays/calendar/:year endpoint for yearly holiday calendar
  - Create PUT /api/holidays/:id endpoint for holiday updates
  - Create DELETE /api/holidays/:id endpoint for holiday removal
  - Add validation for holiday conflicts, department permissions, and recurring holiday logic
  - Update reporting services to exclude holidays from attendance calculations
  - _Requirements: Holiday management functionality_

- [x] 11. Implement Attendance Request System





  - Create AttendanceRequest entity with user, requested date, reason, approval status, and created attendance reference
  - Implement AttendanceRequestService with request creation, approval workflow, and attendance record generation
  - Create AttendanceRequestRepository for data access operations and specialized queries
  - Add validation for request time limits, duplicate requests, and business rule compliance
  - Create POST /api/attendance/request endpoint for employees to request attendance creation
  - Create GET /api/attendance/requests endpoint for user's attendance request history
  - Create GET /api/attendance/requests/pending endpoint for manager's pending approval queue
  - Create POST /api/attendance/requests/approve/:id endpoint for manager approval of attendance requests
  - Update ReportingService to include attendance request statistics in team reports
  - Add business logic to create new DailyAttendance record upon request approval
  - _Requirements: Simple attendance request and approval functionality_

- [ ] 12. Implement Shift Management System
  - Create ShiftTemplate entity with name, start/end times, break duration, and active status
  - Create UserShiftAssignment entity with user, shift template, effective dates, and active status
  - Create ShiftSchedule entity with user, shift, schedule date, and type (SCHEDULED, SWAPPED, OVERTIME)
  - Implement ShiftService with template management, user assignment, and schedule generation
  - Implement ShiftSchedulingService with automatic schedule creation and conflict resolution
  - Implement ShiftSwapService with swap request handling, approval workflow, and schedule updates
  - Update AttendanceService to validate clock-in/out times against assigned shifts
  - Create POST /api/shifts/templates endpoint for shift template creation (admin only)
  - Create GET /api/shifts/templates endpoint for available shift templates
  - Create POST /api/shifts/assign endpoint for user shift assignments
  - Create GET /api/shifts/schedule endpoint for user's shift schedule with date range
  - Create POST /api/shifts/swap/request endpoint for shift swap requests
  - Create POST /api/shifts/swap/approve/:id endpoint for shift swap approvals
  - Add validation for shift conflicts, assignment overlaps, and swap eligibility rules
  - _Requirements: Shift management functionality_

- [ ] 13. Implement Department Schedule Management
  - Create DepartmentSchedule entity with department, name, weekly schedule JSON, and effective dates
  - Create ScheduleException entity with department, exception date, type, and modified hours
  - Implement DepartmentScheduleService with schedule creation, exception handling, and validation
  - Update AttendanceService to validate attendance against department schedules and exceptions
  - Extend ReportingService to include schedule-based analytics and compliance reports
  - Create POST /api/schedules/department endpoint for department schedule creation
  - Create GET /api/schedules/department/:departmentId endpoint for department schedule retrieval
  - Create POST /api/schedules/exceptions endpoint for schedule exception creation
  - Create GET /api/schedules/exceptions endpoint for schedule exceptions with date filtering
  - Create PUT /api/schedules/department/:id endpoint for schedule updates
  - Add validation for schedule conflicts, department permissions, and exception logic
  - Update existing attendance validation to respect department-specific working hours
  - _Requirements: Department schedule functionality_

- [ ] 14. Integrate and Test All New Features
  - Update existing attendance validation to work with leaves, holidays, shifts, and schedules
  - Extend fraud detection to handle new attendance patterns and remote work scenarios
  - Update reporting services to include comprehensive analytics for all new features
  - Create integration tests for leave approval workflows with attendance blocking
  - Test remote work approval integration with attendance location validation
  - Test holiday calendar integration with attendance prevention and reporting
  - Test missed attendance detection with automatic correction workflows
  - Test shift-based attendance validation with schedule compliance
  - Test department schedule integration with exception handling
  - Create comprehensive API tests for all new endpoints with proper authorization
  - Update existing API tests to work with new attendance validation rules
  - Add performance tests for complex queries involving multiple feature interactions
  - _Requirements: Integration and comprehensive testing of all features_