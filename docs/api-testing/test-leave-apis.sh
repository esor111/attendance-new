#!/bin/bash

# Leave Management API Testing Script
# Tests all leave management endpoints with sample data

BASE_URL="http://localhost:3000"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    local auth_header="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" -H "$CONTENT_TYPE" -H "$auth_header")
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" -H "$CONTENT_TYPE")
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "$CONTENT_TYPE" -H "$auth_header" -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "$CONTENT_TYPE" -d "$data")
        fi
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $response_body"
    fi
    echo "----------------------------------------"
}

echo "==================================="
echo "Leave Management API Testing"
echo "==================================="
echo ""

# Note: These tests assume JWT authentication is implemented
# For now, we'll test without authentication to check endpoint availability
AUTH_HEADER="Authorization: Bearer test-jwt-token"

echo "Testing Leave Management Endpoints..."
echo ""

# Test 1: Get user leave balances
run_test "Get User Leave Balances" "GET" "/api/leave/balance" "" "401" ""

# Test 2: Get user leave requests
run_test "Get User Leave Requests" "GET" "/api/leave/requests" "" "401" ""

# Test 3: Create leave request (should fail without auth)
leave_request_data='{
  "leaveTypeId": "550e8400-e29b-41d4-a716-446655440000",
  "startDate": "2025-10-15",
  "endDate": "2025-10-17",
  "daysRequested": 3,
  "reason": "Family vacation"
}'
run_test "Create Leave Request (No Auth)" "POST" "/api/leave/request" "$leave_request_data" "401" ""

# Test 4: Get team leave requests (manager endpoint)
run_test "Get Team Leave Requests" "GET" "/api/leave/team-requests" "" "401" ""

# Test 5: Get pending approvals
run_test "Get Pending Approvals" "GET" "/api/leave/pending-approvals" "" "401" ""

# Test 6: Get leave statistics
run_test "Get Leave Statistics" "GET" "/api/leave/statistics" "" "401" ""

# Test 7: Approve leave request (should fail without auth)
approval_data='{
  "status": "APPROVED",
  "comments": "Approved for family vacation"
}'
run_test "Approve Leave Request (No Auth)" "POST" "/api/leave/approve/550e8400-e29b-41d4-a716-446655440000" "$approval_data" "401" ""

# Test 8: Cancel leave request (should fail without auth)
run_test "Cancel Leave Request (No Auth)" "POST" "/api/leave/requests/550e8400-e29b-41d4-a716-446655440000/cancel" "" "401" ""

# Test 9: Get approval statistics
run_test "Get Approval Statistics" "GET" "/api/leave/approval-statistics?startDate=2025-10-01&endDate=2025-10-31" "" "401" ""

echo ""
echo "==================================="
echo "Test Summary"
echo "==================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi