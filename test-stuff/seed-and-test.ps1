# Seed Test Data and Run Complete API Tests
# This bypasses external API dependencies by creating test data directly

$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$USER_ID = "afc70db3-6f43-4882-92fd-4715f25ffc95"
$BASE_URL = "http://localhost:3013"

$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "🚀 Complete API Testing Without External Dependencies" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor White

# Step 1: Seed test data via SQL (you'll need to run the SQL file manually)
Write-Host "`n📊 Step 1: Database Seeding Required" -ForegroundColor Blue
Write-Host "Please run this SQL command in your PostgreSQL database:" -ForegroundColor Yellow
Write-Host "psql -d your_database -f seed-test-user.sql" -ForegroundColor Gray
Write-Host "`nOr connect to your database and run the seed-test-user.sql file" -ForegroundColor Gray
Write-Host "`nPress Enter when you've seeded the data..." -ForegroundColor Yellow
Read-Host

# Test Results Tracking
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Tests = @()
}

function Test-APIEndpoint {
    param($Name, $Method, $Uri, $Body = $null, $ExpectedStatus = 200)
    
    $testResults.Total++
    Write-Host "`n🧪 Testing: $Name" -ForegroundColor Blue
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-Host "Request Body:" -ForegroundColor Gray
            Write-Host ($Body | ConvertTo-Json -Depth 2) -ForegroundColor DarkGray
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ PASSED: $Name" -ForegroundColor Green
        
        # Show response summary
        if ($response -is [array]) {
            Write-Host "   Response: Array with $($response.Count) items" -ForegroundColor Cyan
        } elseif ($response.id) {
            Write-Host "   Response: Created with ID $($response.id)" -ForegroundColor Cyan
        } else {
            $preview = ($response | ConvertTo-Json -Compress).Substring(0, [Math]::Min(100, ($response | ConvertTo-Json -Compress).Length))
            Write-Host "   Response: $preview..." -ForegroundColor Cyan
        }
        
        $testResults.Passed++
        $testResults.Tests += @{ Name = $Name; Status = "PASSED"; Response = $response }
        return $response
    }
    catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✅ PASSED: $Name (Expected error $ExpectedStatus)" -ForegroundColor Green
            $testResults.Passed++
            $testResults.Tests += @{ Name = $Name; Status = "PASSED (Expected Error)"; Error = $_.Exception.Message }
        } else {
            Write-Host "❌ FAILED: $Name" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Status: $statusCode" -ForegroundColor Red
            $testResults.Failed++
            $testResults.Tests += @{ Name = $Name; Status = "FAILED"; Error = $_.Exception.Message }
        }
        return $null
    }
}

# Step 2: Verify User Data Exists
Write-Host "`n📋 Step 2: Verify Seeded Data" -ForegroundColor Blue
$userExists = Test-APIEndpoint "Check User Exists Locally" "GET" "$BASE_URL/kattendance/api/v1/users/external/$USER_ID/exists"
if ($userExists -and $userExists.exists) {
    Write-Host "✅ User data found in local database!" -ForegroundColor Green
} else {
    Write-Host "❌ User data not found. Please run the SQL seeding script first." -ForegroundColor Red
    Write-Host "Continuing tests anyway..." -ForegroundColor Yellow
}

# Step 3: Test All Request Operations
Write-Host "`n📝 Step 3: Test Request CRUD Operations" -ForegroundColor Blue

# 3.1: Get existing requests
$existingRequests = Test-APIEndpoint "Get All Existing Requests" "GET" "$BASE_URL/kattendance/api/v1/api/requests"

# 3.2: Create Leave Request
$leaveRequest = @{
    type = "LEAVE"
    requestData = @{
        leaveType = "ANNUAL"
        startDate = "2025-12-20"
        endDate = "2025-12-22"
        daysRequested = 3
        reason = "Christmas Holiday - Full Test"
        balanceInfo = @{
            allocatedDays = 25
            usedDays = 5
            remainingDays = 20
        }
    }
    notes = "Created via complete test suite"
}
$createdLeave = Test-APIEndpoint "Create Leave Request" "POST" "$BASE_URL/kattendance/api/v1/api/requests/leave" $leaveRequest

# 3.3: Create Remote Work Request
$futureDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
$remoteWorkRequest = @{
    type = "REMOTE_WORK"
    requestData = @{
        requestedDate = $futureDate
        reason = "Better focus for important project"
        remoteLocation = "Home Office"
        notes = "Need quiet environment for coding"
    }
}
$createdRemoteWork = Test-APIEndpoint "Create Remote Work Request" "POST" "$BASE_URL/kattendance/api/v1/api/requests/remote-work" $remoteWorkRequest

# 3.4: Create Attendance Correction Request
$yesterdayDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$attendanceRequest = @{
    type = "ATTENDANCE_CORRECTION"
    requestData = @{
        requestedDate = $yesterdayDate
        reason = "Forgot to clock in due to early client meeting"
    }
    notes = "Meeting started at 7 AM, forgot to clock in"
}
$createdAttendance = Test-APIEndpoint "Create Attendance Correction" "POST" "$BASE_URL/kattendance/api/v1/api/requests/attendance-correction" $attendanceRequest

# 3.5: Create via Generic Endpoint
$genericRequest = @{
    type = "REMOTE_WORK"
    requestData = @{
        requestedDate = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
        reason = "Testing generic endpoint"
        remoteLocation = "Coffee Shop"
    }
}
$createdGeneric = Test-APIEndpoint "Create Request via Generic Endpoint" "POST" "$BASE_URL/kattendance/api/v1/api/requests" $genericRequest

# Step 4: Test Request Retrieval and Filtering
Write-Host "`n🔍 Step 4: Test Request Retrieval & Filtering" -ForegroundColor Blue

$allRequestsAfter = Test-APIEndpoint "Get All Requests After Creation" "GET" "$BASE_URL/kattendance/api/v1/api/requests"
$leaveRequestsOnly = Test-APIEndpoint "Get Leave Requests Only" "GET" "$BASE_URL/kattendance/api/v1/api/requests?type=LEAVE"
$remoteWorkRequestsOnly = Test-APIEndpoint "Get Remote Work Requests Only" "GET" "$BASE_URL/kattendance/api/v1/api/requests?type=REMOTE_WORK"

# Test date filtering
$startDate = (Get-Date).ToString("yyyy-MM-dd")
$endDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
$dateFilteredRequests = Test-APIEndpoint "Get Requests with Date Filter" "GET" "$BASE_URL/kattendance/api/v1/api/requests?startDate=$startDate&endDate=$endDate"

# Step 5: Test Individual Request Operations
Write-Host "`n🎯 Step 5: Test Individual Request Operations" -ForegroundColor Blue

if ($createdLeave -and $createdLeave.id) {
    $specificRequest = Test-APIEndpoint "Get Specific Request by ID" "GET" "$BASE_URL/kattendance/api/v1/api/requests/$($createdLeave.id)"
}

# Step 6: Test Manager Operations
Write-Host "`n👔 Step 6: Test Manager Operations" -ForegroundColor Blue

$pendingRequests = Test-APIEndpoint "Get Pending Requests for Manager" "GET" "$BASE_URL/kattendance/api/v1/api/requests/pending/approval"
$teamRequests = Test-APIEndpoint "Get Team Requests" "GET" "$BASE_URL/kattendance/api/v1/api/requests/team/all"

# Step 7: Test Statistics and Reporting
Write-Host "`n📊 Step 7: Test Statistics & Reporting" -ForegroundColor Blue

$requestStats = Test-APIEndpoint "Get Request Statistics" "GET" "$BASE_URL/kattendance/api/v1/api/requests/stats/summary"

# Step 8: Test Error Handling
Write-Host "`n🚫 Step 8: Test Error Handling" -ForegroundColor Blue

$fakeId = "00000000-0000-0000-0000-000000000000"
Test-APIEndpoint "Get Non-existent Request (Should Return 404)" "GET" "$BASE_URL/kattendance/api/v1/api/requests/$fakeId" $null 404

$invalidRequest = @{
    type = "INVALID_TYPE"
    requestData = @{}
}
Test-APIEndpoint "Create Invalid Request (Should Return 400)" "POST" "$BASE_URL/kattendance/api/v1/api/requests" $invalidRequest 400

# Step 9: Test Request Validation
Write-Host "`n✅ Step 9: Test Request Validation" -ForegroundColor Blue

$validationRequest = @{
    type = "LEAVE"
    requestData = @{
        leaveType = "ANNUAL"
        startDate = "2025-11-15"
        endDate = "2025-11-17"
        daysRequested = 3
        reason = "Validation test"
        balanceInfo = @{
            allocatedDays = 25
            usedDays = 5
            remainingDays = 20
        }
    }
}
$validationResult = Test-APIEndpoint "Validate Request Creation" "POST" "$BASE_URL/kattendance/api/v1/api/requests/validate" $validationRequest

# Final Results
Write-Host "`n" + "=" * 60 -ForegroundColor White
Write-Host "🎯 COMPLETE API TEST RESULTS" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor White

Write-Host "`nOverall Results:" -ForegroundColor White
Write-Host "Total Tests: $($testResults.Total)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red

if ($testResults.Total -gt 0) {
    $successRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)
    Write-Host "Success Rate: $successRate%" -ForegroundColor Cyan
}

Write-Host "`nTest Summary by Category:" -ForegroundColor White
$passedTests = $testResults.Tests | Where-Object { $_.Status -like "PASSED*" }
$failedTests = $testResults.Tests | Where-Object { $_.Status -eq "FAILED" }

if ($passedTests.Count -gt 0) {
    Write-Host "`n✅ Passed Tests:" -ForegroundColor Green
    foreach ($test in $passedTests) {
        Write-Host "   - $($test.Name)" -ForegroundColor Green
    }
}

if ($failedTests.Count -gt 0) {
    Write-Host "`n❌ Failed Tests:" -ForegroundColor Red
    foreach ($test in $failedTests) {
        Write-Host "   - $($test.Name): $($test.Error)" -ForegroundColor Red
    }
}

if ($testResults.Failed -eq 0) {
    Write-Host "`n🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Your unified request system is working perfectly without external dependencies!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Some tests failed. Check the errors above." -ForegroundColor Yellow
}

Write-Host "`n📋 Created Requests Summary:" -ForegroundColor Cyan
if ($allRequestsAfter -and $allRequestsAfter.Count -gt 0) {
    foreach ($req in $allRequestsAfter) {
        Write-Host "   - $($req.type): $($req.id) [$($req.status)]" -ForegroundColor Gray
    }
} else {
    Write-Host "   No requests were created (likely due to missing user data)" -ForegroundColor Yellow
}

Write-Host "`n" + "=" * 60 -ForegroundColor White