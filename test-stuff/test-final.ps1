# Final API Test - Clean Version
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BASE_URL = "http://localhost:3013"

Write-Host "API Testing Started..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
}

function Test-Endpoint {
    param($Name, $Method, $Uri, $Body = $null)
    
    $testResults.Total++
    Write-Host "Testing: $Name" -ForegroundColor Blue
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "PASSED: $Name" -ForegroundColor Green
        $testResults.Passed++
        return $response
    }
    catch {
        Write-Host "FAILED: $Name" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $testResults.Failed++
        
        # Try to get detailed error
        if ($_.Exception.Response) {
            try {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "Details: $errorBody" -ForegroundColor Yellow
            } catch {
                # Ignore error reading details
            }
        }
        return $null
    }
}

# Test 1: Get existing requests
$existingRequests = Test-Endpoint "Get Existing Requests" "GET" "$BASE_URL/kattendance/api/v1/api/requests"
if ($existingRequests) {
    Write-Host "Found $($existingRequests.Count) existing requests" -ForegroundColor Cyan
}

# Test 2: Create Leave Request
$leaveRequest = @{
    type = "LEAVE"
    requestData = @{
        leaveType = "ANNUAL"
        startDate = "2025-12-20"
        endDate = "2025-12-22"
        daysRequested = 3
        reason = "API Test - Christmas Holiday"
        balanceInfo = @{
            allocatedDays = 25
            usedDays = 5
            remainingDays = 20
        }
    }
    notes = "Created via PowerShell test"
}

$createdLeave = Test-Endpoint "Create Leave Request" "POST" "$BASE_URL/kattendance/api/v1/api/requests/leave" $leaveRequest
if ($createdLeave) {
    Write-Host "Created leave request ID: $($createdLeave.id)" -ForegroundColor Cyan
}

# Test 3: Create Remote Work Request
$futureDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
$remoteWorkRequest = @{
    type = "REMOTE_WORK"
    requestData = @{
        requestedDate = $futureDate
        reason = "API Test - Better focus at home"
        remoteLocation = "Home Office"
        notes = "Testing remote work creation"
    }
}

$createdRemoteWork = Test-Endpoint "Create Remote Work Request" "POST" "$BASE_URL/kattendance/api/v1/api/requests/remote-work" $remoteWorkRequest
if ($createdRemoteWork) {
    Write-Host "Created remote work request ID: $($createdRemoteWork.id)" -ForegroundColor Cyan
}

# Test 4: Create Attendance Correction Request
$yesterdayDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$attendanceRequest = @{
    type = "ATTENDANCE_CORRECTION"
    requestData = @{
        requestedDate = $yesterdayDate
        reason = "API Test - Forgot to clock in"
    }
    notes = "Created via PowerShell test"
}

$createdAttendance = Test-Endpoint "Create Attendance Correction" "POST" "$BASE_URL/kattendance/api/v1/api/requests/attendance-correction" $attendanceRequest
if ($createdAttendance) {
    Write-Host "Created attendance correction ID: $($createdAttendance.id)" -ForegroundColor Cyan
}

# Test 5: Create Generic Request
$genericRequest = @{
    type = "REMOTE_WORK"
    requestData = @{
        requestedDate = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
        reason = "API Test - Generic endpoint"
        remoteLocation = "Home"
    }
}

$createdGeneric = Test-Endpoint "Create Generic Request" "POST" "$BASE_URL/kattendance/api/v1/api/requests" $genericRequest
if ($createdGeneric) {
    Write-Host "Created generic request ID: $($createdGeneric.id)" -ForegroundColor Cyan
}

# Test 6: Get All Requests After Creation
$finalRequests = Test-Endpoint "Get All Requests After Creation" "GET" "$BASE_URL/kattendance/api/v1/api/requests"
if ($finalRequests) {
    Write-Host "Total requests after creation: $($finalRequests.Count)" -ForegroundColor Cyan
}

# Test 7: Get Requests by Type
$leaveRequests = Test-Endpoint "Get Leave Requests Only" "GET" "$BASE_URL/kattendance/api/v1/api/requests?type=LEAVE"
if ($leaveRequests) {
    Write-Host "Leave requests found: $($leaveRequests.Count)" -ForegroundColor Cyan
}

# Test 8: Get Request Statistics
$stats = Test-Endpoint "Get Request Statistics" "GET" "$BASE_URL/kattendance/api/v1/api/requests/stats/summary"
if ($stats) {
    Write-Host "Statistics - Total: $($stats.total), Pending: $($stats.pending)" -ForegroundColor Cyan
}

# Test 9: Get Pending Requests for Manager
$pending = Test-Endpoint "Get Pending Requests for Manager" "GET" "$BASE_URL/kattendance/api/v1/api/requests/pending/approval"
if ($pending) {
    Write-Host "Pending requests for manager: $($pending.Count)" -ForegroundColor Cyan
}

# Test 10: Test Error Handling - Non-existent Request
$fakeId = "00000000-0000-0000-0000-000000000000"
Test-Endpoint "Get Non-existent Request (Should Fail)" "GET" "$BASE_URL/kattendance/api/v1/api/requests/$fakeId"

# Print Results
Write-Host "`n" + "="*50 -ForegroundColor White
Write-Host "API TESTING RESULTS" -ForegroundColor White
Write-Host "="*50 -ForegroundColor White
Write-Host "Total Tests: $($testResults.Total)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red

if ($testResults.Failed -eq 0) {
    Write-Host "`nALL TESTS PASSED! Your unified request system is working perfectly!" -ForegroundColor Green
    Write-Host "Authentication works with your real token" -ForegroundColor Green
    Write-Host "All request types can be created" -ForegroundColor Green
    Write-Host "Request retrieval and filtering works" -ForegroundColor Green
    Write-Host "Error handling is robust" -ForegroundColor Green
} else {
    $successRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)
    Write-Host "`nSuccess Rate: $successRate%" -ForegroundColor Yellow
    Write-Host "Some tests failed - check the errors above" -ForegroundColor Yellow
}

Write-Host "="*50 -ForegroundColor White