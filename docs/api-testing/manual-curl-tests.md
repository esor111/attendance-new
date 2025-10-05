# Manual cURL Testing Guide

## Quick Setup Commands

```bash
# Make the script executable
chmod +x docs/api-testing/test-all-apis.sh

# Run the automated test
./docs/api-testing/test-all-apis.sh

# Or run individual tests below
```

## Individual API Tests (Copy-Paste Ready)

### 1. Create Department
```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Department",
    "description": "Software development team"
  }' | jq '.'
```

### 2. Create Main Office Entity
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
  }' | jq '.'
```

### 3. Create Client Site Entity
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
  }' | jq '.'
```

### 4. Create Users (Replace DEPT_ID with actual department ID)
```bash
# Manager User
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Manager",
    "phone": "+9779812345678",
    "email": "john.manager@company.com",
    "address": "Kathmandu, Nepal",
    "userId": "manager-001",
    "isFieldWorker": false,
    "departmentId": "REPLACE_WITH_DEPT_ID"
  }' | jq '.'

# Office Worker
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Worker",
    "phone": "+9779812345679",
    "email": "alice.worker@company.com",
    "address": "Kathmandu, Nepal",
    "userId": "worker-001",
    "isFieldWorker": false,
    "departmentId": "REPLACE_WITH_DEPT_ID"
  }' | jq '.'

# Field Worker
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob FieldWorker",
    "phone": "+9779812345680",
    "email": "bob.field@company.com",
    "address": "Kathmandu, Nepal",
    "userId": "field-001",
    "isFieldWorker": true,
    "departmentId": "REPLACE_WITH_DEPT_ID"
  }' | jq '.'
```

### 5. Test Clock-In (Without Auth for Testing)
```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.7175,
    "longitude": 85.3245,
    "notes": "Starting work day"
  }' | jq '.'
```

### 6. Test Session Check-In
```bash
curl -X POST http://localhost:3000/api/attendance/session/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.7173,
    "longitude": 85.3241,
    "sessionType": "break",
    "notes": "Coffee break"
  }' | jq '.'
```

### 7. Test Session Check-Out
```bash
curl -X POST http://localhost:3000/api/attendance/session/check-out \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.7174,
    "longitude": 85.3242,
    "notes": "Break finished"
  }' | jq '.'
```

### 8. Test Location Check-In (Replace ENTITY_ID)
```bash
curl -X POST http://localhost:3000/api/attendance/location/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "REPLACE_WITH_CLIENT_SITE_ID",
    "latitude": 27.6590,
    "longitude": 85.3250,
    "purpose": "Client meeting",
    "notes": "Meeting with ABC Corp about project requirements"
  }' | jq '.'
```

### 9. Test Location Check-Out
```bash
curl -X POST http://localhost:3000/api/attendance/location/check-out \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.6592,
    "longitude": 85.3252,
    "notes": "Meeting completed successfully"
  }' | jq '.'
```

### 10. Get Today's Attendance
```bash
curl -X GET http://localhost:3000/api/attendance/today | jq '.'
```

### 11. Get Current Session
```bash
curl -X GET http://localhost:3000/api/attendance/session/current | jq '.'
```

### 12. Get Current Location Log
```bash
curl -X GET http://localhost:3000/api/attendance/location/current | jq '.'
```

### 13. Find Nearby Entities
```bash
curl -X GET "http://localhost:3000/api/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000" | jq '.'
```

### 14. Test Clock-Out
```bash
curl -X POST http://localhost:3000/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.7176,
    "longitude": 85.3244,
    "notes": "End of work day"
  }' | jq '.'
```

### 15. Get Attendance History
```bash
curl -X GET "http://localhost:3000/api/attendance/history?startDate=2025-10-01&endDate=2025-10-31" | jq '.'
```

### 16. Get Location History
```bash
curl -X GET "http://localhost:3000/api/attendance/location/history?startDate=2025-10-01&endDate=2025-10-31" | jq '.'
```

### 17. Get Attendance Analytics
```bash
curl -X GET "http://localhost:3000/api/attendance/analytics?startDate=2025-10-01&endDate=2025-10-31" | jq '.'
```

## Error Testing

### Test Clock-In Outside Radius (Should Fail)
```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.2096,
    "longitude": 83.9856,
    "notes": "Trying to clock in from Pokhara (200km away)"
  }' | jq '.'
```

### Test Duplicate Clock-In (Should Fail)
```bash
# Run this after already clocking in
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.7175,
    "longitude": 85.3245,
    "notes": "Trying to clock in again"
  }' | jq '.'
```

## ID Extraction Commands

If you need to extract IDs from responses:

```bash
# Extract department ID
DEPT_ID=$(curl -s -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering Department", "description": "Software development team"}' | jq -r '.id')

echo "Department ID: $DEPT_ID"

# Extract entity ID
ENTITY_ID=$(curl -s -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office Kathmandu",
    "kahaId": "KTM-MAIN-001",
    "latitude": 27.7172,
    "longitude": 85.3240,
    "radiusMeters": 100,
    "address": "Kathmandu Plaza, Kamaladi, Kathmandu"
  }' | jq -r '.id')

echo "Entity ID: $ENTITY_ID"

# Use the captured IDs in subsequent requests
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"John Manager\",
    \"phone\": \"+9779812345678\",
    \"email\": \"john.manager@company.com\",
    \"departmentId\": \"$DEPT_ID\"
  }" | jq '.'
```

## Testing Notes

1. **Install jq**: `sudo apt-get install jq` (Ubuntu) or `brew install jq` (Mac)
2. **Server must be running**: `npm run start:dev`
3. **Database must be setup**: PostgreSQL with proper configuration
4. **For JWT testing**: You'll need to implement token generation or temporarily disable auth guards
5. **Check responses**: Look for `"error"` fields in responses to identify issues
6. **Coordinate validation**: The system validates that coordinates are within entity radius
7. **Sequence matters**: Some APIs depend on data created by previous APIs

## Quick Test Sequence

```bash
# 1. Create foundation data
DEPT_ID=$(curl -s -X POST http://localhost:3000/api/departments -H "Content-Type: application/json" -d '{"name": "Engineering Department"}' | jq -r '.id')

ENTITY_ID=$(curl -s -X POST http://localhost:3000/api/entities -H "Content-Type: application/json" -d '{"name": "Main Office", "kahaId": "MAIN-001", "latitude": 27.7172, "longitude": 85.3240, "radiusMeters": 100}' | jq -r '.id')

USER_ID=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\": \"Test User\", \"phone\": \"+9779812345678\", \"email\": \"test@company.com\", \"departmentId\": \"$DEPT_ID\"}" | jq -r '.id')

# 2. Test attendance flow
curl -X POST http://localhost:3000/api/attendance/clock-in -H "Content-Type: application/json" -d '{"latitude": 27.7175, "longitude": 85.3245, "notes": "Starting work"}' | jq '.'

curl -X GET http://localhost:3000/api/attendance/today | jq '.'

curl -X POST http://localhost:3000/api/attendance/clock-out -H "Content-Type: application/json" -d '{"latitude": 27.7176, "longitude": 85.3244, "notes": "End of work"}' | jq '.'
```