# Attendance Microservice API Testing Sequence

## Overview
This document provides a step-by-step sequence to test all APIs in the correct order, handling data dependencies and ID capturing.

## Prerequisites
- Server running on `http://localhost:3000`
- PostgreSQL database setup and running
- All modules properly initialized

---

## PHASE 1: FOUNDATION DATA SETUP

### Step 1: Create Department
**Purpose**: Create a department first as users and entities will reference it

```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Department",
    "description": "Software development team"
  }'
```

**Expected Response**:
```json
{
  "id": "dept-uuid-123",
  "name": "Engineering Department",
  "description": "Software development team",
  "createdAt": "2025-10-05T10:00:00Z"
}
```

**📝 CAPTURE**: `departmentId = "dept-uuid-123"`

---

### Step 2: Create Business Entity (Office Location)
**Purpose**: Create main office location for attendance

```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office Kathmandu",
    "kahaId": "KTM-MAIN-001",
    "latitude": 27.7172,
    "longitude": 85.3240,
    "radiusMeters": 100,
    "address": "Kathmandu Plaza, Kamaladi, Kathmandu",
    "description": "Main headquarters building"
  }'
```

**Expected Response**:
```json
{
  "id": "entity-main-office-uuid",
  "name": "Main Office Kathmandu",
  "kahaId": "KTM-MAIN-001",
  "geohash": "tuvz1bc8",
  "location": {
    "type": "Point",
    "coordinates": [85.3240, 27.7172]
  },
  "radiusMeters": 100,
  "address": "Kathmandu Plaza, Kamaladi, Kathmandu",
  "createdAt": "2025-10-05T10:01:00Z"
}
```

**📝 CAPTURE**: `mainOfficeEntityId = "entity-main-office-uuid"`

---

### Step 3: Create Client Site Entity (for Field Workers)
**Purpose**: Create client location for field worker testing

```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Client Site ABC Corp",
    "kahaId": "CLIENT-ABC-001",
    "latitude": 27.6588,
    "longitude": 85.3247,
    "radiusMeters": 150,
    "address": "Lalitpur Business Center, Lalitpur",
    "description": "ABC Corporation client office"
  }'
```

**Expected Response**:
```json
{
  "id": "entity-client-site-uuid",
  "name": "Client Site ABC Corp",
  "kahaId": "CLIENT-ABC-001",
  "geohash": "tuvz1bc7",
  "location": {
    "type": "Point",
    "coordinates": [85.3247, 27.6588]
  },
  "radiusMeters": 150,
  "createdAt": "2025-10-05T10:02:00Z"
}
```

**📝 CAPTURE**: `clientSiteEntityId = "entity-client-site-uuid"`

---

### Step 4: Create Users
**Purpose**: Create different types of users for testing

#### 4a. Create Manager User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Manager",
    "phone": "+9779812345678",
    "email": "john.manager@company.com",
    "address": "Kathmandu, Nepal",
    "userId": "manager-001",
    "isFieldWorker": false,
    "departmentId": "dept-uuid-123"
  }'
```

**📝 CAPTURE**: `managerId = "manager-user-uuid"`

#### 4b. Create Office Worker User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Worker",
    "phone": "+9779812345679",
    "email": "alice.worker@company.com",
    "address": "Kathmandu, Nepal",
    "userId": "worker-001",
    "isFieldWorker": false,
    "departmentId": "dept-uuid-123"
  }'
```

**📝 CAPTURE**: `officeWorkerId = "office-worker-uuid"`

#### 4c. Create Field Worker User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob FieldWorker",
    "phone": "+9779812345680",
    "email": "bob.field@company.com",
    "address": "Kathmandu, Nepal",
    "userId": "field-001",
    "isFieldWorker": true,
    "departmentId": "dept-uuid-123"
  }'
```

**📝 CAPTURE**: `fieldWorkerId = "field-worker-uuid"`

---

## PHASE 2: DEPARTMENT-ENTITY RELATIONSHIPS

### Step 5: Assign Main Office to Department
**Purpose**: Link department to main office as primary location

```bash
curl -X POST http://localhost:3000/api/departments/dept-uuid-123/entities \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "entity-main-office-uuid",
    "isPrimary": true
  }'
```

### Step 6: Assign Client Site to Department
**Purpose**: Add client site as secondary location

```bash
curl -X POST http://localhost:3000/api/departments/dept-uuid-123/entities \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "entity-client-site-uuid",
    "isPrimary": false
  }'
```

---

## PHASE 3: USER-ENTITY ASSIGNMENTS (Optional Overrides)

### Step 7: Create User-Specific Entity Assignment
**Purpose**: Give field worker specific access to client site

```bash
curl -X POST http://localhost:3000/api/attendance/user-entity-assignments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "field-worker-uuid",
    "entityId": "entity-client-site-uuid",
    "isPrimary": false
  }'
```

---

## PHASE 4: REPORTING STRUCTURE

### Step 8: Create Manager-Employee Relationship
**Purpose**: Set up reporting hierarchy

```bash
curl -X POST http://localhost:3000/api/attendance/reporting-structure \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "office-worker-uuid",
    "managerId": "manager-user-uuid",
    "startDate": "2025-10-01"
  }'
```

```bash
curl -X POST http://localhost:3000/api/attendance/reporting-structure \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "field-worker-uuid",
    "managerId": "manager-user-uuid",
    "startDate": "2025-10-01"
  }'
```

---

## PHASE 5: CORE ATTENDANCE TESTING

### Step 9: Office Worker Clock-In
**Purpose**: Test basic clock-in functionality

```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <office-worker-jwt-token>" \
  -d '{
    "latitude": 27.7175,
    "longitude": 85.3245,
    "notes": "Starting work day"
  }'
```

**Expected Response**:
```json
{
  "id": "attendance-uuid-1",
  "userId": "office-worker-uuid",
  "date": "2025-10-05",
  "clockInTime": "2025-10-05T09:00:00Z",
  "clockInLatitude": 27.7175,
  "clockInLongitude": 85.3245,
  "entityId": "entity-main-office-uuid",
  "isWithinRadius": true,
  "isFlagged": false,
  "status": "Present",
  "notes": "Starting work day"
}
```

**📝 CAPTURE**: `attendanceId1 = "attendance-uuid-1"`

---

### Step 10: Field Worker Clock-In
**Purpose**: Test field worker clock-in

```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <field-worker-jwt-token>" \
  -d '{
    "latitude": 27.7170,
    "longitude": 85.3242,
    "notes": "Field worker starting day"
  }'
```

**📝 CAPTURE**: `attendanceId2 = "attendance-uuid-2"`

---

## PHASE 6: SESSION MANAGEMENT TESTING

### Step 11: Office Worker Session Check-In (Break)
**Purpose**: Test session management

```bash
curl -X POST http://localhost:3000/api/attendance/session/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <office-worker-jwt-token>" \
  -d '{
    "latitude": 27.7173,
    "longitude": 85.3241,
    "sessionType": "break",
    "notes": "Coffee break"
  }'
```

**📝 CAPTURE**: `sessionId1 = "session-uuid-1"`

---

### Step 12: Office Worker Session Check-Out
**Purpose**: Complete session cycle

```bash
curl -X POST http://localhost:3000/api/attendance/session/check-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <office-worker-jwt-token>" \
  -d '{
    "latitude": 27.7174,
    "longitude": 85.3242,
    "notes": "Break finished"
  }'
```

---

## PHASE 7: FIELD WORKER LOCATION TESTING

### Step 13: Field Worker Location Check-In
**Purpose**: Test client site visit tracking

```bash
curl -X POST http://localhost:3000/api/attendance/location/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <field-worker-jwt-token>" \
  -d '{
    "entityId": "entity-client-site-uuid",
    "latitude": 27.6590,
    "longitude": 85.3250,
    "purpose": "Client meeting",
    "notes": "Meeting with ABC Corp about project requirements"
  }'
```

**📝 CAPTURE**: `locationLogId1 = "location-log-uuid-1"`

---

### Step 14: Field Worker Location Check-Out
**Purpose**: Complete location visit cycle

```bash
curl -X POST http://localhost:3000/api/attendance/location/check-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <field-worker-jwt-token>" \
  -d '{
    "latitude": 27.6592,
    "longitude": 85.3252,
    "notes": "Meeting completed successfully"
  }'
```

---

## PHASE 8: ATTENDANCE QUERIES

### Step 15: Get Today's Attendance
**Purpose**: Verify attendance records

```bash
curl -X GET http://localhost:3000/api/attendance/today \
  -H "Authorization: Bearer <office-worker-jwt-token>"
```

### Step 16: Get Current Session
**Purpose**: Check active session status

```bash
curl -X GET http://localhost:3000/api/attendance/session/current \
  -H "Authorization: Bearer <office-worker-jwt-token>"
```

### Step 17: Get Current Location Log
**Purpose**: Check active location status

```bash
curl -X GET http://localhost:3000/api/attendance/location/current \
  -H "Authorization: Bearer <field-worker-jwt-token>"
```

---

## PHASE 9: REPORTING TESTING

### Step 18: Manager Get Team Attendance
**Purpose**: Test manager reporting access

```bash
curl -X GET "http://localhost:3000/api/attendance/team?startDate=2025-10-05&endDate=2025-10-05" \
  -H "Authorization: Bearer <manager-jwt-token>"
```

### Step 19: Get Individual Team Member Attendance
**Purpose**: Test detailed employee reports

```bash
curl -X GET "http://localhost:3000/api/attendance/team/office-worker-uuid?startDate=2025-10-05&endDate=2025-10-05" \
  -H "Authorization: Bearer <manager-jwt-token>"
```

---

## PHASE 10: CLOCK-OUT TESTING

### Step 20: Office Worker Clock-Out
**Purpose**: Complete daily attendance cycle

```bash
curl -X POST http://localhost:3000/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <office-worker-jwt-token>" \
  -d '{
    "latitude": 27.7176,
    "longitude": 85.3244,
    "notes": "End of work day"
  }'
```

### Step 21: Field Worker Clock-Out
**Purpose**: Complete field worker day

```bash
curl -X POST http://localhost:3000/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <field-worker-jwt-token>" \
  -d '{
    "latitude": 27.7171,
    "longitude": 85.3243,
    "notes": "Field work completed"
  }'
```

---

## PHASE 11: ANALYTICS AND HISTORY

### Step 22: Get Attendance History
**Purpose**: Test historical data retrieval

```bash
curl -X GET "http://localhost:3000/api/attendance/history?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer <office-worker-jwt-token>"
```

### Step 23: Get Location History
**Purpose**: Test field worker location history

```bash
curl -X GET "http://localhost:3000/api/attendance/location/history?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer <field-worker-jwt-token>"
```

### Step 24: Get Attendance Analytics
**Purpose**: Test analytics and patterns

```bash
curl -X GET "http://localhost:3000/api/attendance/analytics?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer <office-worker-jwt-token>"
```

---

## PHASE 12: ADMIN FUNCTIONS

### Step 25: Get Flagged Records
**Purpose**: Test fraud detection results

```bash
curl -X GET "http://localhost:3000/api/attendance/flagged?limit=50" \
  -H "Authorization: Bearer <admin-jwt-token>"
```

---

## PHASE 13: ENTITY ACCESS TESTING

### Step 26: Get User's Authorized Entities
**Purpose**: Test entity access resolution

```bash
curl -X GET http://localhost:3000/api/attendance/entity-access/authorized \
  -H "Authorization: Bearer <field-worker-jwt-token>"
```

### Step 27: Find Nearby Entities
**Purpose**: Test proximity-based entity discovery

```bash
curl -X GET "http://localhost:3000/api/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000"
```

---

## ERROR TESTING SCENARIOS

### Step 28: Test Clock-In Outside Radius
**Purpose**: Test location validation

```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <office-worker-jwt-token>" \
  -d '{
    "latitude": 28.2096,
    "longitude": 83.9856,
    "notes": "Trying to clock in from Pokhara"
  }'
```

**Expected**: 400 Bad Request with location validation error

### Step 29: Test Duplicate Clock-In
**Purpose**: Test duplicate prevention

```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <office-worker-jwt-token>" \
  -d '{
    "latitude": 27.7175,
    "longitude": 85.3245,
    "notes": "Trying to clock in again"
  }'
```

**Expected**: 409 Conflict with duplicate attendance error

---

## TESTING NOTES

### ID Capture Strategy
1. Save each response to a file: `curl ... > response.json`
2. Extract IDs using jq: `cat response.json | jq -r '.id'`
3. Use environment variables: `export DEPT_ID=$(cat response.json | jq -r '.id')`

### Authentication Notes
- Replace `<jwt-token>` with actual JWT tokens
- For testing without auth, temporarily disable JWT guards
- Use different tokens for different user roles

### Coordinate Notes
- Main Office: `27.7172, 85.3240` (Kathmandu)
- Client Site: `27.6588, 85.3247` (Lalitpur)
- Outside locations for error testing: `28.2096, 83.9856` (Pokhara)

### Expected Flow
1. Foundation data (departments, entities, users)
2. Relationships (dept-entity, user-entity, reporting)
3. Daily operations (clock-in, sessions, locations)
4. Queries and reports
5. Clock-out and completion
6. Analytics and history
7. Error scenarios

This sequence ensures all dependencies are met and provides comprehensive API testing coverage.