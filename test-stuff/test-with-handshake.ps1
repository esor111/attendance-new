# Test with proper handshake process
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$USER_ID = "afc70db3-6f43-4882-92fd-4715f25ffc95"
$BASE_URL = "http://localhost:3013"

$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "Starting API test with handshake process..." -ForegroundColor Cyan

# Step 1: Handshake - Populate user data
Write-Host "`n1. Performing user handshake..." -ForegroundColor Blue
try {
    $userResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/users/external/$USER_ID" -Method GET -Headers $headers
    Write-Host "SUCCESS: User handshake completed" -ForegroundColor Green
    Write-Host "User: $($userResponse.name) ($($userResponse.email))" -ForegroundColor Cyan
} catch {
    Write-Host "FAILED: User handshake failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    
    Write-Host "Continuing with tests anyway..." -ForegroundColor Yellow
}

# Step 2: Check if user exists locally
Write-Host "`n2. Checking if user exists locally..." -ForegroundColor Blue
try {
    $existsResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/users/external/$USER_ID/exists" -Method GET -Headers $headers
    Write-Host "SUCCESS: User exists check completed" -ForegroundColor Green
    Write-Host "User exists locally: $($existsResponse.exists)" -ForegroundColor Cyan
} catch {
    Write-Host "FAILED: User exists check failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Get user profile
Write-Host "`n3. Getting user profile..." -ForegroundColor Blue
try {
    $profileResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/users/$USER_ID/profile" -Method GET -Headers $headers
    Write-Host "SUCCESS: User profile retrieved" -ForegroundColor Green
    $deptName = if ($profileResponse.department) { $profileResponse.department.name } else { "None" }
    Write-Host "Profile: $($profileResponse.name) - Department: $deptName" -ForegroundColor Cyan
} catch {
    Write-Host "FAILED: User profile retrieval failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Now try to create a leave request
Write-Host "`n4. Creating leave request after handshake..." -ForegroundColor Blue

$leaveRequest = @{
    type = "LEAVE"
    requestData = @{
        leaveType = "ANNUAL"
        startDate = "2025-12-20"
        endDate = "2025-12-22"
        daysRequested = 3
        reason = "Christmas Holiday - After Handshake"
        balanceInfo = @{
            allocatedDays = 25
            usedDays = 5
            remainingDays = 20
        }
    }
    notes = "Created after proper handshake"
}

try {
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/leave" -Method POST -Headers $headers -Body ($leaveRequest | ConvertTo-Json -Depth 10)
    Write-Host "SUCCESS: Leave request created!" -ForegroundColor Green
    Write-Host "Request ID: $($createResponse.id)" -ForegroundColor Cyan
    Write-Host "Status: $($createResponse.status)" -ForegroundColor Cyan
    Write-Host "Type: $($createResponse.type)" -ForegroundColor Cyan
} catch {
    Write-Host "FAILED: Leave request creation failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
        
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "Formatted Error:" -ForegroundColor Red
            Write-Host ($errorJson | ConvertTo-Json -Depth 10) -ForegroundColor Yellow
        } catch {
            # Ignore JSON parsing errors
        }
    }
}

# Step 5: Get all requests to see what was created
Write-Host "`n5. Getting all requests..." -ForegroundColor Blue
try {
    $allRequests = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests" -Method GET -Headers $headers
    Write-Host "SUCCESS: Retrieved $($allRequests.Count) requests" -ForegroundColor Green
    
    if ($allRequests.Count -gt 0) {
        Write-Host "`nRequests found:" -ForegroundColor Cyan
        foreach ($req in $allRequests) {
            Write-Host "  - ID: $($req.id)" -ForegroundColor Gray
            Write-Host "    Type: $($req.type)" -ForegroundColor Gray
            Write-Host "    Status: $($req.status)" -ForegroundColor Gray
            Write-Host "    Created: $($req.createdAt)" -ForegroundColor Gray
            Write-Host ""
        }
    }
} catch {
    Write-Host "FAILED: Could not retrieve requests" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nHandshake test completed!" -ForegroundColor Green