# Leave Management System Documentation

## Overview

The Leave Management System provides comprehensive functionality for managing employee leave requests, approvals, and balance tracking. It integrates with the existing attendance system and reporting structure to provide a complete leave management solution.

## Features

### Core Functionality
- **Leave Request Management**: Create, view, cancel, and track leave requests
- **Approval Workflow**: Manager-based approval system with notification support
- **Balance Management**: Automatic leave balance calculations and tracking
- **Leave Types**: Configurable leave types with different rules and policies
- **Carry Forward**: Year-end leave balance carry forward processing
- **Team Management**: Manager views for team leave requests and approvals

### Key Components

#### Entities
1. **LeaveType**: Defines different types of leave (Annual, Sick, Personal, etc.)
2. **LeaveRequest**: Individual leave requests with approval workflow
3. **LeaveBalance**: User leave balances by type and year

#### Services
1. **LeaveService**: Core leave request operations
2. **LeaveApprovalService**: Approval workflow and manager permissions
3. **LeaveBalanceService**: Balance calculations and year-end processing

## API Endpoints

### Leave Requests

#### POST /api/leave/request
Create a new leave request
```json
{
  "leaveTypeId": "uuid",
  "startDate": "2025-10-15",
  "endDate": "2025-10-17",
  "daysRequested": 3,
  "reason": "Family vacation",
  "isEmergency": false,
  "emergencyJustification": "Optional emergency reason"
}
```

#### GET /api/leave/requests
Get user's leave request history
- Query params: `limit` (optional)

#### GET /api/leave/requests/:id
Get specific leave request details

#### POST /api/leave/requests/:id/cancel
Cancel a leave request

### Approvals

#### POST /api/leave/approve/:id
Approve or reject a leave request (managers only)
```json
{
  "status": "APPROVED", // or "REJECTED"
  "comments": "Approved for family vacation",
  "rejectionReason": "Optional rejection reason"
}
```

#### GET /api/leave/pending-approvals
Get pending approvals for manager

#### GET /api/leave/team-requests
Get team leave requests for managers
- Query params: `startDate`, `endDate` (optional)

### Balances

#### GET /api/leave/balance
Get user's leave balances
- Query params: `year` (optional, defaults to current year)

#### GET /api/leave/statistics
Get leave usage statistics
- Query params: `year` (optional)

### Manager Reports

#### GET /api/leave/approval-statistics
Get approval statistics for managers
- Query params: `startDate`, `endDate` (required)

## Leave Types Configuration

### Default Leave Types

1. **Annual Leave**
   - Max days: 25 per year
   - Requires approval: Yes
   - Can carry forward: Yes (max 5 days)
   - Advance notice: 7 days

2. **Sick Leave**
   - Max days: 10 per year
   - Requires approval: No
   - Can carry forward: No
   - Advance notice: 0 days

3. **Personal Leave**
   - Max days: 5 per year
   - Requires approval: Yes
   - Can carry forward: No
   - Advance notice: 3 days

4. **Maternity Leave**
   - Max days: 90 per year
   - Requires approval: Yes
   - Can carry forward: No
   - Advance notice: 30 days

5. **Paternity Leave**
   - Max days: 14 per year
   - Requires approval: Yes
   - Can carry forward: No
   - Advance notice: 30 days

6. **Emergency Leave**
   - Max days: 3 per year
   - Requires approval: Yes
   - Can carry forward: No
   - Advance notice: 0 days

7. **Bereavement Leave**
   - Max days: 5 per year
   - Requires approval: Yes
   - Can carry forward: No
   - Advance notice: 0 days

## Business Rules

### Leave Request Validation
- Start date cannot be after end date
- Cannot overlap with existing approved/pending leave
- Must have sufficient leave balance
- Must meet advance notice requirements (unless emergency)
- Emergency leave requires justification

### Approval Workflow
- Requests requiring approval are sent to direct manager
- Managers can approve/reject requests for their direct reports
- Auto-approval for leave types that don't require approval
- Escalation support for complex approval chains

### Balance Management
- Balances are automatically initialized for new users
- Used days are updated when leave is approved
- Pending days are tracked for pending requests
- Year-end carry forward processing for eligible leave types
- Balance recalculation based on approved requests

### Access Control
- Users can only view/manage their own leave requests
- Managers can view/approve requests for their team members
- System validates manager-employee relationships through reporting structure

## Database Schema

### leave_types
- id (UUID, PK)
- name (VARCHAR, UNIQUE)
- description (TEXT)
- max_days_per_year (INTEGER)
- requires_approval (BOOLEAN)
- can_carry_forward (BOOLEAN)
- max_carry_forward_days (INTEGER)
- min_advance_notice_days (INTEGER)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)

### leave_requests
- id (UUID, PK)
- user_id (UUID, FK)
- leave_type_id (UUID, FK)
- start_date (DATE)
- end_date (DATE)
- days_requested (DECIMAL)
- reason (TEXT)
- status (ENUM: PENDING, APPROVED, REJECTED, CANCELLED)
- approver_id (UUID, FK)
- approved_at (TIMESTAMP)
- approval_comments (TEXT)
- rejection_reason (TEXT)
- is_emergency (BOOLEAN)
- emergency_justification (TEXT)
- created_at, updated_at (TIMESTAMP)

### leave_balances
- id (UUID, PK)
- user_id (UUID, FK)
- leave_type_id (UUID, FK)
- year (INTEGER)
- allocated_days (DECIMAL)
- used_days (DECIMAL)
- carried_forward_days (DECIMAL)
- pending_days (DECIMAL)
- created_at, updated_at (TIMESTAMP)
- UNIQUE(user_id, leave_type_id, year)

## Integration Points

### Attendance System
- Uses reporting structure for manager-employee relationships
- Integrates with user management for employee data

### Notification System (Future)
- Leave request notifications to managers
- Approval/rejection notifications to employees
- Reminder notifications for pending approvals

## Error Handling

### Common Error Scenarios
- Insufficient leave balance
- Overlapping leave requests
- Invalid date ranges
- Unauthorized approval attempts
- Missing required fields

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Insufficient leave balance. Available: 5 days, Requested: 7 days",
  "error": "Bad Request"
}
```

## Testing

### API Testing
Use the provided test script: `docs/api-testing/test-leave-apis.sh`

### Test Scenarios
- Leave request creation with various validations
- Approval workflow testing
- Balance calculation verification
- Manager permission validation
- Error handling verification

## Future Enhancements

### Planned Features
- Email/SMS notifications
- Leave calendar integration
- Bulk leave operations
- Advanced reporting and analytics
- Mobile app support
- Integration with payroll systems
- Holiday calendar integration
- Leave policy templates

### Performance Optimizations
- Caching for frequently accessed data
- Database indexing optimization
- Batch processing for year-end operations
- API response optimization

## Maintenance

### Regular Tasks
- Year-end carry forward processing
- Leave balance reconciliation
- Inactive leave type cleanup
- Performance monitoring

### Monitoring
- API response times
- Database query performance
- Error rates and patterns
- User adoption metrics