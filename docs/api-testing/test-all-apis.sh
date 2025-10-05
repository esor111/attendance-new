#!/bin/bash

# Attendance Microservice API Testing Script
# This script tests all APIs in the correct sequence with ID capturing

set -e  # Exit on any error

# Configuration
BASE_URL="http://localhost:3000"
RESPONSE_DIR="./api-responses"
LOG_FILE="./api-test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create response directory
mkdir -p $RESPONSE_DIR

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $LOG_FILE
}

# Function to make API call and capture response
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_token=$4
    local response_file=$5
    
    local curl_cmd="curl -s -X $method $BASE_URL$endpoint"
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ ! -z "$auth_token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_token'"
    fi
    
    # Add response file
    curl_cmd="$curl_cmd -o $RESPONSE_DIR/$response_file"
    
    log "Calling: $method $endpoint"
    eval $curl_cmd
    
    # Check if response contains error
    if grep -q '"error"' "$RESPONSE_DIR/$response_file" 2>/dev/null; then
        error "API call failed: $(cat $RESPONSE_DIR/$response_file)"
        return 1
    else
        success "API call successful"
        return 0
    fi
}

# Function to extract ID from response
extract_id() {
    local response_file=$1
    local id_field=${2:-"id"}
    
    if command -v jq &> /dev/null; then
        jq -r ".$id_field" "$RESPONSE_DIR/$response_file" 2>/dev/null || echo ""
    else
        # Fallback without jq
        grep -o "\"$id_field\":\"[^\"]*\"" "$RESPONSE_DIR/$response_file" | cut -d'"' -f4 || echo ""
    fi
}

# Start testing
log "🚀 Starting Attendance Microservice API Testing"
log "Base URL: $BASE_URL"

# Variables to store captured IDs
DEPT_ID=""
MAIN_OFFICE_ID=""
CLIENT_SITE_ID=""
MANAGER_ID=""
OFFICE_WORKER_ID=""
FIELD_WORKER_ID=""
ATTENDANCE_ID_1=""
ATTENDANCE_ID_2=""
SESSION_ID_1=""
LOCATION_LOG_ID_1=""

echo "=================================================="
echo "PHASE 1: FOUNDATION DATA SETUP"
echo "=================================================="

# Step 1: Create Department
log "Step 1: Creating Department"
if api_call "POST" "/api/departments" '{
    "name": "Engineering Department",
    "description": "Software development team"
}' "" "dept_response.json"; then
    DEPT_ID=$(extract_id "dept_response.json")
    success "Department created with ID: $DEPT_ID"
else
    error "Failed to create department"
    exit 1
fi

# Step 2: Create Main Office Entity
log "Step 2: Creating Main Office Entity"
if api_call "POST" "/api/entities" '{
    "name": "Main Office Kathmandu",
    "kahaId": "KTM-MAIN-001",
    "latitude": 27.7172,
    "longitude": 85.3240,
    "radiusMeters": 100,
    "address": "Kathmandu Plaza, Kamaladi, Kathmandu",
    "description": "Main headquarters building"
}' "" "main_office_response.json"; then
    MAIN_OFFICE_ID=$(extract_id "main_office_response.json")
    success "Main Office created with ID: $MAIN_OFFICE_ID"
else
    error "Failed to create main office"
    exit 1
fi

# Step 3: Create Client Site Entity
log "Step 3: Creating Client Site Entity"
if api_call "POST" "/api/entities" '{
    "name": "Client Site ABC Corp",
    "kahaId": "CLIENT-ABC-001",
    "latitude": 27.6588,
    "longitude": 85.3247,
    "radiusMeters": 150,
    "address": "Lalitpur Business Center, Lalitpur",
    "description": "ABC Corporation client office"
}' "" "client_site_response.json"; then
    CLIENT_SITE_ID=$(extract_id "client_site_response.json")
    success "Client Site created with ID: $CLIENT_SITE_ID"
else
    error "Failed to create client site"
    exit 1
fi

# Step 4a: Create Manager User
log "Step 4a: Creating Manager User"
if api_call "POST" "/api/users" "{
    \"name\": \"John Manager\",
    \"phone\": \"+9779812345678\",
    \"email\": \"john.manager@company.com\",
    \"address\": \"Kathmandu, Nepal\",
    \"userId\": \"manager-001\",
    \"isFieldWorker\": false,
    \"departmentId\": \"$DEPT_ID\"
}" "" "manager_response.json"; then
    MANAGER_ID=$(extract_id "manager_response.json")
    success "Manager created with ID: $MANAGER_ID"
else
    error "Failed to create manager"
    exit 1
fi

# Step 4b: Create Office Worker User
log "Step 4b: Creating Office Worker User"
if api_call "POST" "/api/users" "{
    \"name\": \"Alice Worker\",
    \"phone\": \"+9779812345679\",
    \"email\": \"alice.worker@company.com\",
    \"address\": \"Kathmandu, Nepal\",
    \"userId\": \"worker-001\",
    \"isFieldWorker\": false,
    \"departmentId\": \"$DEPT_ID\"
}" "" "office_worker_response.json"; then
    OFFICE_WORKER_ID=$(extract_id "office_worker_response.json")
    success "Office Worker created with ID: $OFFICE_WORKER_ID"
else
    error "Failed to create office worker"
    exit 1
fi

# Step 4c: Create Field Worker User
log "Step 4c: Creating Field Worker User"
if api_call "POST" "/api/users" "{
    \"name\": \"Bob FieldWorker\",
    \"phone\": \"+9779812345680\",
    \"email\": \"bob.field@company.com\",
    \"address\": \"Kathmandu, Nepal\",
    \"userId\": \"field-001\",
    \"isFieldWorker\": true,
    \"departmentId\": \"$DEPT_ID\"
}" "" "field_worker_response.json"; then
    FIELD_WORKER_ID=$(extract_id "field_worker_response.json")
    success "Field Worker created with ID: $FIELD_WORKER_ID"
else
    error "Failed to create field worker"
    exit 1
fi

echo "=================================================="
echo "PHASE 2: DEPARTMENT-ENTITY RELATIONSHIPS"
echo "=================================================="

# Step 5: Assign Main Office to Department (Primary)
log "Step 5: Assigning Main Office to Department as Primary"
if api_call "POST" "/api/departments/$DEPT_ID/entities" "{
    \"entityId\": \"$MAIN_OFFICE_ID\",
    \"isPrimary\": true
}" "" "dept_main_office_assignment.json"; then
    success "Main Office assigned to Department as Primary"
else
    warning "Failed to assign main office to department (might not be implemented yet)"
fi

# Step 6: Assign Client Site to Department (Secondary)
log "Step 6: Assigning Client Site to Department as Secondary"
if api_call "POST" "/api/departments/$DEPT_ID/entities" "{
    \"entityId\": \"$CLIENT_SITE_ID\",
    \"isPrimary\": false
}" "" "dept_client_site_assignment.json"; then
    success "Client Site assigned to Department as Secondary"
else
    warning "Failed to assign client site to department (might not be implemented yet)"
fi

echo "=================================================="
echo "PHASE 3: USER-ENTITY ASSIGNMENTS"
echo "=================================================="

# Step 7: Create User-Specific Entity Assignment
log "Step 7: Creating User-Specific Entity Assignment for Field Worker"
if api_call "POST" "/api/attendance/user-entity-assignments" "{
    \"userId\": \"$FIELD_WORKER_ID\",
    \"entityId\": \"$CLIENT_SITE_ID\",
    \"isPrimary\": false
}" "" "user_entity_assignment.json"; then
    success "User-Entity Assignment created"
else
    warning "Failed to create user-entity assignment (might not be implemented yet)"
fi

echo "=================================================="
echo "PHASE 4: REPORTING STRUCTURE"
echo "=================================================="

# Step 8a: Create Manager-Office Worker Relationship
log "Step 8a: Creating Manager-Office Worker Reporting Relationship"
if api_call "POST" "/api/attendance/reporting-structure" "{
    \"employeeId\": \"$OFFICE_WORKER_ID\",
    \"managerId\": \"$MANAGER_ID\",
    \"startDate\": \"2025-10-01\"
}" "" "reporting_office_worker.json"; then
    success "Manager-Office Worker relationship created"
else
    warning "Failed to create reporting relationship (might not be implemented yet)"
fi

# Step 8b: Create Manager-Field Worker Relationship
log "Step 8b: Creating Manager-Field Worker Reporting Relationship"
if api_call "POST" "/api/attendance/reporting-structure" "{
    \"employeeId\": \"$FIELD_WORKER_ID\",
    \"managerId\": \"$MANAGER_ID\",
    \"startDate\": \"2025-10-01\"
}" "" "reporting_field_worker.json"; then
    success "Manager-Field Worker relationship created"
else
    warning "Failed to create reporting relationship (might not be implemented yet)"
fi

echo "=================================================="
echo "PHASE 5: CORE ATTENDANCE TESTING"
echo "=================================================="

# Note: For testing without JWT, we'll skip auth headers for now
# In production, you would need to implement JWT token generation

# Step 9: Office Worker Clock-In
log "Step 9: Office Worker Clock-In"
if api_call "POST" "/api/attendance/clock-in" '{
    "latitude": 27.7175,
    "longitude": 85.3245,
    "notes": "Starting work day"
}' "" "office_worker_clock_in.json"; then
    ATTENDANCE_ID_1=$(extract_id "office_worker_clock_in.json")
    success "Office Worker clocked in with Attendance ID: $ATTENDANCE_ID_1"
else
    warning "Failed office worker clock-in (might need JWT auth)"
fi

# Step 10: Field Worker Clock-In
log "Step 10: Field Worker Clock-In"
if api_call "POST" "/api/attendance/clock-in" '{
    "latitude": 27.7170,
    "longitude": 85.3242,
    "notes": "Field worker starting day"
}' "" "field_worker_clock_in.json"; then
    ATTENDANCE_ID_2=$(extract_id "field_worker_clock_in.json")
    success "Field Worker clocked in with Attendance ID: $ATTENDANCE_ID_2"
else
    warning "Failed field worker clock-in (might need JWT auth)"
fi

echo "=================================================="
echo "PHASE 6: SESSION MANAGEMENT TESTING"
echo "=================================================="

# Step 11: Office Worker Session Check-In
log "Step 11: Office Worker Session Check-In (Break)"
if api_call "POST" "/api/attendance/session/check-in" '{
    "latitude": 27.7173,
    "longitude": 85.3241,
    "sessionType": "break",
    "notes": "Coffee break"
}' "" "session_check_in.json"; then
    SESSION_ID_1=$(extract_id "session_check_in.json")
    success "Session check-in successful with Session ID: $SESSION_ID_1"
else
    warning "Failed session check-in (might need JWT auth)"
fi

# Step 12: Office Worker Session Check-Out
log "Step 12: Office Worker Session Check-Out"
if api_call "POST" "/api/attendance/session/check-out" '{
    "latitude": 27.7174,
    "longitude": 85.3242,
    "notes": "Break finished"
}' "" "session_check_out.json"; then
    success "Session check-out successful"
else
    warning "Failed session check-out (might need JWT auth)"
fi

echo "=================================================="
echo "PHASE 7: FIELD WORKER LOCATION TESTING"
echo "=================================================="

# Step 13: Field Worker Location Check-In
log "Step 13: Field Worker Location Check-In"
if api_call "POST" "/api/attendance/location/check-in" "{
    \"entityId\": \"$CLIENT_SITE_ID\",
    \"latitude\": 27.6590,
    \"longitude\": 85.3250,
    \"purpose\": \"Client meeting\",
    \"notes\": \"Meeting with ABC Corp about project requirements\"
}" "" "location_check_in.json"; then
    LOCATION_LOG_ID_1=$(extract_id "location_check_in.json")
    success "Location check-in successful with Location Log ID: $LOCATION_LOG_ID_1"
else
    warning "Failed location check-in (might need JWT auth)"
fi

# Step 14: Field Worker Location Check-Out
log "Step 14: Field Worker Location Check-Out"
if api_call "POST" "/api/attendance/location/check-out" '{
    "latitude": 27.6592,
    "longitude": 85.3252,
    "notes": "Meeting completed successfully"
}' "" "location_check_out.json"; then
    success "Location check-out successful"
else
    warning "Failed location check-out (might need JWT auth)"
fi

echo "=================================================="
echo "PHASE 8: ATTENDANCE QUERIES"
echo "=================================================="

# Step 15: Get Today's Attendance
log "Step 15: Get Today's Attendance"
if api_call "GET" "/api/attendance/today" "" "" "today_attendance.json"; then
    success "Retrieved today's attendance"
else
    warning "Failed to get today's attendance (might need JWT auth)"
fi

# Step 16: Get Current Session
log "Step 16: Get Current Session"
if api_call "GET" "/api/attendance/session/current" "" "" "current_session.json"; then
    success "Retrieved current session"
else
    warning "Failed to get current session (might need JWT auth)"
fi

# Step 17: Get Current Location Log
log "Step 17: Get Current Location Log"
if api_call "GET" "/api/attendance/location/current" "" "" "current_location.json"; then
    success "Retrieved current location log"
else
    warning "Failed to get current location log (might need JWT auth)"
fi

echo "=================================================="
echo "PHASE 9: ENTITY ACCESS TESTING"
echo "=================================================="

# Step 18: Find Nearby Entities
log "Step 18: Find Nearby Entities"
if api_call "GET" "/api/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000" "" "" "nearby_entities.json"; then
    success "Retrieved nearby entities"
else
    warning "Failed to get nearby entities"
fi

echo "=================================================="
echo "PHASE 10: ERROR TESTING"
echo "=================================================="

# Step 19: Test Clock-In Outside Radius (Should Fail)
log "Step 19: Testing Clock-In Outside Radius (Should Fail)"
if api_call "POST" "/api/attendance/clock-in" '{
    "latitude": 28.2096,
    "longitude": 83.9856,
    "notes": "Trying to clock in from Pokhara"
}' "" "clock_in_outside_radius.json"; then
    warning "Clock-in outside radius succeeded (should have failed)"
else
    success "Clock-in outside radius correctly failed"
fi

echo "=================================================="
echo "TESTING SUMMARY"
echo "=================================================="

log "🎉 API Testing Completed!"
log "📊 Summary of Captured IDs:"
log "   Department ID: $DEPT_ID"
log "   Main Office ID: $MAIN_OFFICE_ID"
log "   Client Site ID: $CLIENT_SITE_ID"
log "   Manager ID: $MANAGER_ID"
log "   Office Worker ID: $OFFICE_WORKER_ID"
log "   Field Worker ID: $FIELD_WORKER_ID"
log "   Attendance ID 1: $ATTENDANCE_ID_1"
log "   Attendance ID 2: $ATTENDANCE_ID_2"
log "   Session ID 1: $SESSION_ID_1"
log "   Location Log ID 1: $LOCATION_LOG_ID_1"

log "📁 All responses saved in: $RESPONSE_DIR"
log "📝 Full log available in: $LOG_FILE"

# Create summary file
cat > "$RESPONSE_DIR/captured_ids.json" << EOF
{
  "departmentId": "$DEPT_ID",
  "mainOfficeId": "$MAIN_OFFICE_ID",
  "clientSiteId": "$CLIENT_SITE_ID",
  "managerId": "$MANAGER_ID",
  "officeWorkerId": "$OFFICE_WORKER_ID",
  "fieldWorkerId": "$FIELD_WORKER_ID",
  "attendanceId1": "$ATTENDANCE_ID_1",
  "attendanceId2": "$ATTENDANCE_ID_2",
  "sessionId1": "$SESSION_ID_1",
  "locationLogId1": "$LOCATION_LOG_ID_1"
}
EOF

success "✅ Captured IDs saved to: $RESPONSE_DIR/captured_ids.json"

echo ""
echo "🔧 Next Steps:"
echo "1. Check responses in $RESPONSE_DIR/ directory"
echo "2. Implement JWT authentication for protected endpoints"
echo "3. Run individual API tests using captured IDs"
echo "4. Test error scenarios and edge cases"
echo ""
echo "📋 To run specific tests, use the captured IDs from captured_ids.json"