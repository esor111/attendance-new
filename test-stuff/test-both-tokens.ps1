# Test Both User Token and Business Token

$USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BUSINESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiYnVzaW5lc3NJZCI6ImMxOTlhYzkwLTdiNTEtNDJlMC04Y2FhLWEyNGM0NWUyYzMwZiIsImlhdCI6MTc1NzkwMjYwNX0.Z2yYPOxjJYTwEpz4vnnG7Z5IpLE1FsUECDn9GvKdLIE"
$BASE_URL = "http://localhost:3013"

function Test-TokenAccess {
    param($TokenName, $Token)
    
    Write-Host "`nTesting $TokenName" -ForegroundColor Cyan
    Write-Host "-" * 30 -ForegroundColor Gray
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    # Test basic endpoint
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests" -Method GET -Headers $headers
        Write-Host "✅ Basic API Access: SUCCESS" -ForegroundColor Green
        Write-Host "   Found $($response.Count) requests" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Basic API Access: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test request creation
    $leaveRequest = @{
        type = "LEAVE"
        requestData = @{
            leaveType = "ANNUAL"
            startDate = "2025-12-20"
            endDate = "2025-12-22"
            daysRequested = 3
            reason = "Testing with $TokenName"
            balanceInfo = @{
                allocatedDays = 25
                usedDays = 5
                remainingDays = 20
            }
        }
        notes = "Created with $TokenName"
    }
    
    try {
        $createResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/leave" -Method POST -Headers $headers -Body ($leaveRequest | ConvertTo-Json -Depth 10)
        Write-Host "✅ Request Creation: SUCCESS" -ForegroundColor Green
        Write-Host "   Created ID: $($createResponse.id)" -ForegroundColor Gray
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
        Write-Host "❌ Request Creation: FAILED (Status: $statusCode)" -ForegroundColor Red
        if ($statusCode -eq 409) {
            Write-Host "   Reason: User not seeded in database" -ForegroundColor Yellow
        }
    }
    
    # Test manager operations
    try {
        $pendingResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/pending/approval" -Method GET -Headers $headers
        Write-Host "✅ Manager Operations: SUCCESS" -ForegroundColor Green
        Write-Host "   Found $($pendingResponse.Count) pending requests" -ForegroundColor Gray
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
        Write-Host "❌ Manager Operations: FAILED (Status: $statusCode)" -ForegroundColor Red
        if ($statusCode -eq 409) {
            Write-Host "   Reason: User not seeded in database" -ForegroundColor Yellow
        }
    }
}

Write-Host "DUAL TOKEN TESTING" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor White

# Test User Token
Test-TokenAccess "USER TOKEN" $USER_TOKEN

# Test Business Token  
Test-TokenAccess "BUSINESS TOKEN" $BUSINESS_TOKEN

Write-Host "`nTOKEN COMPARISON SUMMARY:" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor White

Write-Host "`n🔑 USER TOKEN:" -ForegroundColor Yellow
Write-Host "   Purpose: Basic user authentication" -ForegroundColor Gray
Write-Host "   Contains: User ID + Kaha ID" -ForegroundColor Gray
Write-Host "   Access: Personal operations only" -ForegroundColor Gray
Write-Host "   Use Case: Individual user actions" -ForegroundColor Gray

Write-Host "`n🏢 BUSINESS TOKEN:" -ForegroundColor Yellow
Write-Host "   Purpose: Business context + user authentication" -ForegroundColor Gray
Write-Host "   Contains: User ID + Kaha ID + Business ID" -ForegroundColor Gray
Write-Host "   Access: Personal + Business operations" -ForegroundColor Gray
Write-Host "   Use Case: Multi-tenant business operations" -ForegroundColor Gray

Write-Host "`n📊 BUSINESS CONTEXT:" -ForegroundColor Cyan
Write-Host "   Business ID: c199ac90-7b51-42e0-8caa-a24c45e2c30f" -ForegroundColor Green
Write-Host "   Allows: Cross-user operations within business" -ForegroundColor Gray
Write-Host "   Enables: Manager functions, team reports, etc." -ForegroundColor Gray

Write-Host "`n🎯 WHEN TO USE WHICH:" -ForegroundColor Cyan
Write-Host "   User Token: Personal requests, individual attendance" -ForegroundColor Gray
Write-Host "   Business Token: Manager operations, team management" -ForegroundColor Gray

Write-Host "`n" + "=" * 50 -ForegroundColor White