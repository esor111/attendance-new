# Reporting Module Dependency Map

## 🗺️ Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REPORTING MODULE                          │
│                    (TO BE REMOVED)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Reporting   │    │  Reporting   │    │  Reporting   │
│  Controller  │───▶│   Service    │───▶│ Structure    │
│   ❌ DELETE  │    │   ❌ DELETE  │    │  Repository  │
└──────────────┘    └──────────────┘    │  ✅ KEEP     │
                                        └──────────────┘
                                               │
                                               │ Used by
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │  Attendance  │          │   Request    │          │    Leave     │
            │   Service    │          │   Service    │          │   Service    │
            │   ✅ KEEP    │          │   ✅ KEEP    │          │   ✅ KEEP    │
            └──────────────┘          └──────────────┘          └──────────────┘
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │  Attendance  │          │   Request    │          │    Leave     │
            │  Controller  │          │  Controller  │          │  Controller  │
            │   ✅ KEEP    │          │   ✅ KEEP    │          │   ✅ KEEP    │
            └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 🔗 Repository Usage (CRITICAL - DO NOT BREAK)

```
ReportingStructureRepository
├── Used by AttendanceService
│   ├── getTeamAttendance()
│   ├── getTeamMemberAttendance()
│   └── Uses: getTeamMemberIds(), existsRelationship()
│
├── Used by RequestService
│   ├── canApproveRequest()
│   ├── canAccessRequest()
│   ├── sendApprovalNotification()
│   └── Uses: existsRelationship(), getReportingChain(), findCurrentManagerByEmployeeId()
│
└── Used by LeaveService
    ├── getTeamLeaveRequests()
    ├── getPendingTeamRequests()
    ├── canApproveRequest()
    ├── canAccessRequest()
    └── Uses: findCurrentTeamByManagerId(), existsRelationship(), getReportingChain()
```

**✅ SAFE TO REMOVE ReportingService** - Repository is already used directly by other services!

---

## 📦 Module Dependencies

### attendance.module.ts (MODIFY THIS)

```typescript
// BEFORE (Current State)
import { ReportingController } from './controllers/reporting.controller';  ❌ REMOVE
import { ReportingService } from './services/reporting.service';          ❌ REMOVE

@Module({
  controllers: [
    AttendanceController,
    ReportingController,  ❌ REMOVE
    // ...
  ],
  providers: [
    AttendanceService,
    ReportingService,     ❌ REMOVE
    // ...
  ],
  exports: [
    AttendanceService,
    ReportingService,     ❌ REMOVE
    // ...
  ],
})

// AFTER (Clean State)
// No ReportingController import
// No ReportingService import

@Module({
  controllers: [
    AttendanceController,
    // ReportingController removed
    // ...
  ],
  providers: [
    AttendanceService,
    // ReportingService removed
    // ...
  ],
  exports: [
    AttendanceService,
    // ReportingService removed
    // ...
  ],
})
```

---

## 🧪 Test Dependencies

### Files Using ReportingService in Tests:

```
src/schedule-integration.spec.ts
├── Imports ReportingService          ❌ REMOVE
├── Mocks ReportingService            ❌ REMOVE
└── Tests getTeamAttendanceSummary()  ❌ REMOVE

test/schedule-integration.spec.ts
├── Imports ReportingService          ❌ REMOVE
├── Mocks ReportingService            ❌ REMOVE
└── Tests getTeamAttendanceSummary()  ❌ REMOVE

src/modules/attendance/services/reporting.service.spec.ts
└── Entire file                       ❌ DELETE
```

---

## 🔄 Data Flow Comparison

### BEFORE (With Reporting Module):

```
Manager wants team attendance
        │
        ▼
  ReportingController
  /api/reporting/team/attendance/summary
        │
        ▼
  ReportingService
  .getTeamAttendanceSummary()
        │
        ▼
  ReportingStructureRepository
  .getTeamMemberIds()
        │
        ▼
  DailyAttendanceRepository
  .findByUserIds()
```

### AFTER (Without Reporting Module):

```
Manager wants team attendance
        │
        ▼
  AttendanceController
  /api/attendance/team
        │
        ▼
  AttendanceService
  .getTeamAttendance()
        │
        ▼
  ReportingStructureRepository  ✅ STILL USED
  .getTeamMemberIds()
        │
        ▼
  DailyAttendanceRepository
  .findByUserIds()
```

**Result:** Same functionality, one less layer!

---

## 📊 Impact Summary

### What Gets Removed:
```
❌ ReportingController        (1 file)
❌ ReportingService           (1 file)
❌ ReportingService.spec      (1 file)
❌ CreateReportingStructureDto (1 file)
❌ UpdateReportingStructureDto (1 file)
❌ Test references            (2 files modified)
❌ Module registrations       (1 file modified)
───────────────────────────────────────
Total: 5 files deleted, 3 files modified
```

### What Stays:
```
✅ ReportingStructure entity
✅ ReportingStructureRepository
✅ reporting_structure table
✅ All existing functionality (via other controllers)
✅ AttendanceService
✅ RequestService
✅ LeaveService
```

---

## 🎯 Zero-Impact Removal

The removal has **ZERO IMPACT** on existing services because:

1. **Repository is independent** - Not tied to ReportingService
2. **Already used elsewhere** - AttendanceService, RequestService, LeaveService
3. **No shared state** - ReportingService doesn't maintain any state
4. **Duplicate functionality** - Everything ReportingController does is available elsewhere

---

## 🚨 Breaking Changes

### API Endpoints Removed:
```
❌ POST   /api/reporting/structure
❌ PUT    /api/reporting/structure/:id
❌ PUT    /api/reporting/structure/:id/end
❌ GET    /api/reporting/team/members
❌ GET    /api/reporting/team/attendance/summary
❌ GET    /api/reporting/team/attendance/date
❌ GET    /api/reporting/team/member/:employeeId/detailed
❌ GET    /api/reporting/chain/:employeeId
❌ GET    /api/reporting/subordinates
❌ GET    /api/reporting/access/:employeeId
```

### Replacement Endpoints (Already Exist):
```
✅ GET    /api/attendance/team
✅ GET    /api/attendance/team/:employeeId
✅ GET    /api/requests/team/all
✅ GET    /api/leave/team-requests
```

---

## ✅ Safety Guarantees

1. **No Database Changes** - reporting_structure table stays
2. **No Data Loss** - All data remains intact
3. **No Service Disruption** - Other services unaffected
4. **Easy Rollback** - Git backup branch available
5. **Functionality Preserved** - Everything available via other endpoints

---

**Conclusion:** The removal is safe because ReportingService is a redundant layer on top of functionality that already exists in AttendanceService, RequestService, and LeaveService.
