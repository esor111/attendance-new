# Detailed API Test with Error Handling
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BASE_URL = "http://localhost:3013"

Write-Host "🚀 Detailed API Testing..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

# Test 1: Get existing requests
try {
    Write-Host "`n📋 Getting existing requests..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Found $($response.Count) existing requests" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED to get requests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Create leave request with detailed error handling
try {
    Write-Host "`n🏖️ Creating leave request..." -ForegroundColor Blue
    
    $leaveRequest = @{
        type = "LEAVE"
        requestData = @{
            leaveType = "ANNUAL"
            startDate = "2025-12-20"
            endDate = "2025-12-22"
            daysRequested = 3
            reason = "PowerShell API Test - Christmas Holiday"
            balanceInfo = @{
                allocatedDays = 25
                usedDays = 5
                remainingDays = 20
            }
        }
        notes = "Created via detailed PowerShell test"
    }
    
    Write-Host "Request payload:" -ForegroundColor Cyan
    Write-Host ($leaveRequest | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/leave" -Method POST -Headers $headers -Body ($leaveRequest | ConvertTo-Json -Depth 10)
    Write-Host "✅ SUCCESS: Leave request created!" -ForegroundColor Green
    Write-Host "Request ID: $($createResponse.id)" -ForegroundColor Cyan
    Write-Host "Status: $($createResponse.status)" -ForegroundColor Cyan
    
    $createdRequestId = $createResponse.id
    
} catch {
    Write-Host "❌ FAILED to create leave request" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more detailed error information
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Details: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Yellow
        }
    }
}

# Test 3: Create remote work request
try {
    Write-Host "`n🏠 Creating remote work request..." -ForegroundColor Blue
    
    $futureDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
    $remoteWorkRequest = @{
        type = "REMOTE_WORK"
        requestData = @{
            requestedDate = $futureDate
            reason = "PowerShell API Test - Better focus at home office"
            remoteLocation = "Home Office - PowerShell Test"
            notes = "Testing remote work request creation"
        }
    }
    
    Write-Host "Request payload:" -ForegroundColor Cyan
    Write-Host ($remoteWorkRequest | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    
    $remoteResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/remote-work" -Method POST -Headers $headers -Body ($remoteWorkRequest | ConvertTo-Json -Depth 10)
    Write-Host "✅ SUCCESS: Remote work request created!" -ForegroundColor Green
    Write-Host "Request ID: $($remoteResponse.id)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ FAILED to create remote work request" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Details: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Yellow
        }
    }
}

# Test 4: Create attendance correction request
try {
    Write-Host "`n⏰ Creating attendance correction request..." -ForegroundColor Blue
    
    $yesterdayDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
    $attendanceRequest = @{
        type = "ATTENDANCE_CORRECTION"
        requestData = @{
            requestedDate = $yesterdayDate
            reason = "PowerShell API Test - Forgot to clock in due to early meeting"
        }
        notes = "Created via detailed PowerShell test"
    }
    
    Write-Host "Request payload:" -ForegroundColor Cyan
    Write-Host ($attendanceRequest | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    
    $attendanceResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/attendance-correction" -Method POST -Headers $headers -Body ($attendanceRequest | ConvertTo-Json -Depth 10)
    Write-Host "✅ SUCCESS: Attendance correction request created!" -ForegroundColor Green
    Write-Host "Request ID: $($attendanceResponse.id)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ FAILED to create attendance correction request" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Details: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Yellow
        }
    }
}

# Test 5: Get all requests again to see what was created
try {
    Write-Host "`n📋 Getting all requests after creation..." -ForegroundColor Blue
    $finalResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Found $($finalResponse.Count) total requests" -ForegroundColor Green
    
    if ($finalResponse.Count -gt 0) {
        Write-Host "`nCreated requests:" -ForegroundColor Cyan
        foreach ($req in $finalResponse) {
            Write-Host "  - ID: $($req.id)" -ForegroundColor Gray
            Write-Host "    Type: $($req.type)" -ForegroundColor Gray
            Write-Host "    Status: $($req.status)" -ForegroundColor Gray
            Write-Host "    Created: $($req.createdAt)" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
} catch {
    Write-Host "❌ FAILED to get final requests: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Green