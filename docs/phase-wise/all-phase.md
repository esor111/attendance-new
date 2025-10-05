# Attendance Management System - Complete Phase Documentation
## Point-Based Geolocation System (NestJS + TypeORM + PostgreSQL + PostGIS)

---

# 📋 PHASE 1: USER & ENTITY FOUNDATION

## Overview
Establish the foundational modules for user management and business entity (location) management. This phase creates the building blocks that all other phases depend on.

---

## MODULE 1.1: USER MANAGEMENT

### User Stories
1. **As a system admin**, I want to create user accounts so that employees can use the attendance system
2. **As a system admin**, I want to assign users to departments so that they are grouped by organizational structure
3. **As a system admin**, I want to mark users as field workers so that the system knows who needs location tracking
4. **As a user**, I want to view my profile information so that I can verify my details
5. **As a system admin**, I want to update user information so that records stay current
6. **As a system admin**, I want to soft-delete users so that historical data is preserved

### Use Cases

#### UC-1.1.1: Create User
**Actor:** System Admin  
**Preconditions:** Admin is authenticated  
**Main Flow:**
1. Admin provides user details (name, phone, email, address)
2. System validates email and phone uniqueness
3. System validates department exists (if provided)
4. System generates UUID for user
5. System creates user record with timestamps
6. System returns created user data

**Alternate Flows:**
- A1: Email already exists → Return 409 Conflict
- A2: Phone already exists → Return 409 Conflict
- A3: Department ID invalid → Return 400 Bad Request

**Postconditions:** User account is created and can be assigned roles

#### UC-1.1.2: Get User by ID
**Actor:** System Admin, User (self)  
**Preconditions:** User exists in system  
**Main Flow:**
1. Actor requests user data by UUID
2. System retrieves user with department relation
3. System returns user data (excluding sensitive fields)

**Alternate Flows:**
- A1: User not found → Return 404 Not Found

#### UC-1.1.3: Update User
**Actor:** System Admin  
**Preconditions:** User exists  
**Main Flow:**
1. Admin provides user ID and update data
2. System validates updated email/phone uniqueness
3. System validates department exists (if changed)
4. System updates user record
5. System returns updated user data

**Alternate Flows:**
- A1: User not found → Return 404
- A2: Email/phone conflict → Return 409
- A3: Invalid department → Return 400

#### UC-1.1.4: List Users with Filters
**Actor:** System Admin  
**Preconditions:** None  
**Main Flow:**
1. Admin requests user list with optional filters
2. System applies filters (department, isFieldWorker, search)
3. System applies pagination
4. System returns paginated user list with metadata

#### UC-1.1.5: Assign Department
**Actor:** System Admin  
**Preconditions:** User and department exist  
**Main Flow:**
1. Admin provides user ID and department ID
2. System validates department exists
3. System updates user's department_id
4. System returns success confirmation

### Database Schema

```sql
-- Table: departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    user_id VARCHAR(255),
    is_field_worker BOOLEAN DEFAULT FALSE,
    department_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_department FOREIGN KEY (department_id) 
        REFERENCES departments(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
```

### API Endpoints

#### 1. Create User
```
POST /api/users
Content-Type: application/json

Request Body:
{
  "name": "John Doe",
  "phone": "+9779812345678",
  "email": "john.doe@company.com",
  "address": "Kathmandu, Nepal",
  "userId": "external-service-id-123",
  "isFieldWorker": true,
  "departmentId": "uuid-of-department"
}

Response: 201 Created
{
  "id": "generated-uuid",
  "name": "John Doe",
  "phone": "+9779812345678",
  "email": "john.doe@company.com",
  "address": "Kathmandu, Nepal",
  "userId": "external-service-id-123",
  "isFieldWorker": true,
  "departmentId": "uuid-of-department",
  "department": {
    "id": "uuid-of-department",
    "name": "Sales"
  },
  "createdAt": "2025-10-05T10:30:00Z"
}
```

### DTOs (Data Transfer Objects)

#### CreateUserDto
- name: string (required, min 2 chars)
- phone: string (required, unique, format validation)
- email: string (required, unique, email format)
- address: string (optional)
- userId: string (optional, external microservice ID)
- isFieldWorker: boolean (optional, default false)
- departmentId: string (optional, UUID format)

#### UpdateUserDto
- name: string (optional)
- phone: string (optional)
- email: string (optional)
- address: string (optional)
- isFieldWorker: boolean (optional)
- departmentId: string (optional)

#### UserResponseDto
- id: string
- name: string
- phone: string
- email: string
- address: string or null
- userId: string or null
- isFieldWorker: boolean
- departmentId: string or null
- department: object (optional)
- createdAt: Date

### Business Rules
1. Email must be unique across all users
2. Phone must be unique across all users
3. Phone must be in valid format (E.164 recommended)
4. If departmentId is provided, department must exist
5. Default isFieldWorker to false if not specified
6. Soft delete should preserve user data for historical records
7. When user is deleted, set department_id to NULL

### Validation Rules
- name: Required, 2-255 characters
- phone: Required, unique, valid phone format
- email: Required, unique, valid email format
- address: Optional, max 500 characters
- userId: Optional, alphanumeric + hyphens
- isFieldWorker: Boolean
- departmentId: Optional, valid UUID format

### Service Methods Required
```
UserService Methods:
- create(dto: CreateUserDto): Promise<User>
- findById(id: string): Promise<User>
- findAll(query: ListUsersQueryDto): Promise<PaginatedResponse<User>>
- update(id: string, dto: UpdateUserDto): Promise<User>
- assignDepartment(userId: string, departmentId: string): Promise<User>
- softDelete(id: string): Promise<void>
- findByEmail(email: string): Promise<User | null>
- findByPhone(phone: string): Promise<User | null>
```

### Testing Checklist
- [ ] Create user with all fields
- [ ] Create user with only required fields
- [ ] Create user with existing email (should fail)
- [ ] Create user with existing phone (should fail)
- [ ] Create user with invalid department (should fail)
- [ ] Get user by valid ID
- [ ] Get user by invalid ID (should fail)
- [ ] Update user name and address
- [ ] Update user email to existing email (should fail)
- [ ] List users without filters
- [ ] List users filtered by department
- [ ] List users filtered by isFieldWorker
- [ ] List users with search term
- [ ] Assign valid department to user
- [ ] Assign invalid department to user (should fail)

---

## MODULE 1.2: ENTITY (BUSINESS LOCATION) MANAGEMENT

### User Stories
1. **As a system admin**, I want to register business locations (entities) so that they can be used for attendance check-ins
2. **As a system admin**, I want to store precise GPS coordinates for each entity so that location validation is accurate
3. **As a system admin**, I want to set a radius for each entity so that check-ins within that radius are valid
4. **As a system admin**, I want to use geohash for efficient proximity searches
5. **As a field worker**, I want to find nearby entities so that I know where I can check in
6. **As a system admin**, I want to update entity details so that information stays current

### Use Cases

#### UC-1.2.1: Create Entity
**Actor:** System Admin  
**Preconditions:** Admin is authenticated  
**Main Flow:**
1. Admin provides entity details (name, kahaId, location, radius)
2. System validates kahaId uniqueness
3. System calculates geohash from coordinates
4. System validates location is valid Point geometry
5. System creates entity record
6. System returns created entity data

**Alternate Flows:**
- A1: kahaId already exists → Return 409 Conflict
- A2: Invalid coordinates → Return 400 Bad Request

**Postconditions:** Entity is available for attendance check-ins

### Database Schema

```sql
-- Table: entities
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    kaha_id VARCHAR(100) NOT NULL UNIQUE,
    geohash VARCHAR(12) NOT NULL,
    address TEXT,
    location GEOGRAPHY(POINT, 4326),
    radius_meters INTEGER NOT NULL DEFAULT 100,
    avatar_url TEXT,
    cover_image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_entities_kaha_id ON entities(kaha_id);
CREATE INDEX idx_entities_geohash ON entities(geohash);
CREATE INDEX idx_entities_location ON entities USING GIST(location);
```

### API Endpoints

#### 1. Create Entity
```
POST /api/entities
Content-Type: application/json

Request Body:
{
  "name": "ABC Company HQ",
  "kahaId": "abc-hq-ktm-001",
  "latitude": 27.7172,
  "longitude": 85.3240,
  "radiusMeters": 150,
  "address": "Kathmandu Plaza, Kamaladi",
  "description": "Main headquarters building"
}

Response: 201 Created
{
  "id": "entity-uuid",
  "name": "ABC Company HQ",
  "kahaId": "abc-hq-ktm-001",
  "geohash": "tuvz1bc8",
  "location": {
    "type": "Point",
    "coordinates": [85.3240, 27.7172]
  },
  "radiusMeters": 150,
  "address": "Kathmandu Plaza, Kamaladi",
  "createdAt": "2025-10-05T10:30:00Z"
}
```

#### 2. Find Nearby Entities
```
GET /api/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000

Response: 200 OK
{
  "data": [
    {
      "id": "entity-uuid",
      "name": "ABC Company HQ",
      "kahaId": "abc-hq-ktm-001",
      "distance": 0,
      "radiusMeters": 150
    }
  ],
  "meta": {
    "searchRadius": 5000,
    "totalFound": 1
  }
}
```

### DTOs

#### CreateEntityDto
- name: string (required)
- kahaId: string (required, unique)
- latitude: number (required, -90 to 90)
- longitude: number (required, -180 to 180)
- radiusMeters: number (required, 10-1000)
- address: string (optional)
- description: string (optional)

### Business Rules
1. kahaId must be unique across all entities
2. radiusMeters must be between 10 and 1000 meters
3. Geohash must be automatically calculated from coordinates
4. Location must use SRID 4326 (WGS84)
5. Distance calculation uses Haversine formula

### Testing Checklist
- [ ] Create entity with valid coordinates
- [ ] Create entity with duplicate kahaId (should fail)
- [ ] Verify geohash is calculated correctly
- [ ] Find nearby entities from specific location
- [ ] Validate location within radius

---

# 📋 PHASE 2: DEPARTMENT-ENTITY RELATIONSHIPS

## MODULE 2.1: DEPARTMENT-ENTITY ASSIGNMENTS

### User Stories
1. **As a system admin**, I want to assign entities to departments so that employees can only check in at authorized locations
2. **As a system admin**, I want to mark one entity as the primary location for each department
3. **As a system admin**, I want to assign multiple field locations to a department

### Database Schema

```sql
CREATE TABLE department_entity_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_department FOREIGN KEY (department_id) 
        REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_entity FOREIGN KEY (entity_id) 
        REFERENCES entities(id) ON DELETE CASCADE,
    CONSTRAINT unique_dept_entity UNIQUE (department_id, entity_id)
);
```

### Business Rules
1. A department can have multiple entities assigned
2. Only ONE entity can be marked as primary per department
3. Primary entity is typically the main office
4. Field locations are non-primary entities

---

# 📋 PHASE 3: CORE ATTENDANCE (CLOCK-IN/OUT)

## MODULE 3.1: DAILY ATTENDANCE

### User Stories
1. **As an employee**, I want to clock-in at the start of my workday
2. **As an employee**, I want to clock-out at the end of my workday
3. **As the system**, I want to validate location is within entity radius
4. **As the system**, I want to detect fraud by calculating travel speed

### Database Schema

```sql
CREATE TABLE daily_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    clock_in_time TIMESTAMP WITH TIME ZONE,
    clock_in_latitude DECIMAL(10, 8),
    clock_in_longitude DECIMAL(11, 8),
    clock_out_time TIMESTAMP WITH TIME ZONE,
    clock_out_latitude DECIMAL(10, 8),
    clock_out_longitude DECIMAL(11, 8),
    entity_id UUID,
    is_within_radius BOOLEAN,
    travel_speed_kmph DECIMAL(6, 2),
    is_flagged BOOLEAN DEFAULT FALSE,
    total_hours DECIMAL(5, 2),
    status VARCHAR(20) DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_entity FOREIGN KEY (entity_id) 
        REFERENCES entities(id) ON DELETE SET NULL,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);
```

### API Endpoints

#### Clock-In
```
POST /api/attendance/clock-in
{
  "latitude": 27.7172,
  "longitude": 85.3240,
  "notes": "Starting work"
}

Response: 201 Created
{
  "id": "attendance-uuid",
  "userId": "user-uuid",
  "date": "2025-10-05",
  "clockInTime": "2025-10-05T09:00:00Z",
  "isWithinRadius": true,
  "entity": {
    "name": "ABC Company HQ"
  }
}
```

#### Clock-Out
```
POST /api/attendance/clock-out
{
  "latitude": 27.7175,
  "longitude": 85.3245
}

Response: 200 OK
{
  "id": "attendance-uuid",
  "clockOutTime": "2025-10-05T17:30:00Z",
  "totalHours": 8.5,
  "travelSpeedKmph": 2.5,
  "isFlagged": false
}
```

### Business Rules
1. User can only clock-in once per day
2. Must clock-in before clocking-out
3. Location must be within primary entity radius
4. Travel speed > 200 km/h flags the record
5. Total hours = clock_out_time - clock_in_time

---

# 📋 PHASE 4: FIELD WORKER CHECK-INS

## MODULE 4.1: LOCATION LOGS

### User Stories
1. **As a field worker**, I want to check-in when I arrive at a client site
2. **As a field worker**, I want to check-out when I leave a client site
3. **As a field worker**, I want to visit multiple sites in one day

### Database Schema

```sql
CREATE TABLE location_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    is_within_radius BOOLEAN,
    travel_speed_kmph DECIMAL(6, 2),
    is_flagged BOOLEAN DEFAULT FALSE,
    visit_duration_minutes INTEGER,
    purpose TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance FOREIGN KEY (attendance_id) 
        REFERENCES daily_attendance(id) ON DELETE CASCADE,
    CONSTRAINT fk_entity_log FOREIGN KEY (entity_id) 
        REFERENCES entities(id) ON DELETE SET NULL
);
```

### API Endpoints

#### Check-In
```
POST /api/attendance/check-in
{
  "entityId": "entity-uuid",
  "latitude": 27.7172,
  "longitude": 85.3240,
  "purpose": "Client meeting"
}

Response: 201 Created
{
  "id": "log-uuid",
  "entity": {
    "name": "Client Site A"
  },
  "checkInTime": "2025-10-05T10:30:00Z",
  "isWithinRadius": true
}
```

#### Check-Out
```
POST /api/attendance/check-out
{
  "latitude": 27.7175,
  "longitude": 85.3245
}

Response: 200 OK
{
  "id": "log-uuid",
  "checkOutTime": "2025-10-05T12:15:00Z",
  "visitDurationMinutes": 105,
  "travelSpeedKmph": 3.5
}
```

### Business Rules
1. Must clock-in to daily_attendance before any check-ins
2. Can have multiple check-ins per day
3. Each check-in must have a check-out before next check-in
4. Location validated against entity radius
5. Travel speed calculated between consecutive visits

---

# 📋 PHASE 5: USER-SPECIFIC ENTITY ASSIGNMENTS

## MODULE 5.1: USER-ENTITY OVERRIDES

### User Stories
1. **As a system admin**, I want to assign specific entities to individual users
2. **As the system**, I want to check user-specific assignments before department assignments

### Database Schema

```sql
CREATE TABLE user_entity_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_assignment FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_entity_assignment FOREIGN KEY (entity_id) 
        REFERENCES entities(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_entity UNIQUE (user_id, entity_id)
);
```

### Business Rules
1. User-specific assignments override department assignments
2. Lookup order: User assignments → Department assignments
3. Only one primary entity per user

---

# 📋 PHASE 6: REPORTING & MANAGER ACCESS

## MODULE 6.1: REPORTING STRUCTURE

### Database Schema

```sql
CREATE TABLE reporting_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) 
        REFERENCES users(id),
    CONSTRAINT fk_manager FOREIGN KEY (manager_id) 
        REFERENCES users(id)
);
```

## MODULE 6.2: ATTENDANCE REPORTS

### API Endpoints

#### Team Attendance Summary
```
GET /api/attendance/team?date=2025-10-05

Response: 200 OK
{
  "date": "2025-10-05",
  "teamMembers": [
    {
      "name": "John Doe",
      "status": "Present",
      "clockInTime": "2025-10-05T09:00:00Z",
      "totalHours": 8.5
    }
  ],
  "summary": {
    "totalEmployees": 10,
    "present": 8,
    "absent": 2
  }
}
```

---

# 📋 PHASE 7: SECURITY & AUDIT

## MODULE 7.1: SYSTEM LOGS

### Database Schema

```sql
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    CONSTRAINT fk_system_log_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL
);
```

### Fraud Detection Rules
1. Travel speed > 200 km/h → Flag record
2. Location outside radius → Reject or flag
3. Impossible distance in short time → Flag record

---

# FUTURE PHASES

- Phase 8: Leave Management
- Phase 9: Missed Attendance Requests
- Phase 10: Holiday Calendar
- Phase 11: Polygon Geofences (when needed)
- Phase 12: Push Notifications (when needed)

---

# DEVELOPMENT STRATEGY

1. Complete each phase entirely before moving to next
2. Write DTOs, Services, Controllers for each module
3. Test thoroughly with Postman/Integration tests
4. Document APIs as you build
5. Use TypeORM entities from the start
6. Keep it simple - no premature optimization