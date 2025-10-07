# Simple API Test
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BASE_URL = "http://localhost:3013"

Write-Host "Testing API..." -ForegroundColor Cyan

try {
    $headers = @{
        "Authorization" = "Bearer $AUTH_TOKEN"
        "Content-Type" = "application/json"
    }
    
    Write-Host "Testing server connection..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests" -Method GET -Headers $headers
    Write-Host "SUCCESS: Server is responding!" -ForegroundColor Green
    if ($response -is [array]) {
        Write-Host "Found requests count: $($response.Count)" -ForegroundColor Cyan
    } else {
        Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    }
    
    Write-Host "Creating test leave request..." -ForegroundColor Blue
    $leaveRequest = @{
        type = "LEAVE"
        requestData = @{
            leaveType = "ANNUAL"
            startDate = "2025-12-20"
            endDate = "2025-12-22"
            daysRequested = 3
            reason = "PowerShell API Test"
            balanceInfo = @{
                allocatedDays = 25
                usedDays = 5
                remainingDays = 20
            }
        }
        notes = "Created via PowerShell test"
    }
    
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/leave" -Method POST -Headers $headers -Body ($leaveRequest | ConvertTo-Json -Depth 10)
    Write-Host "SUCCESS: Leave request created!" -ForegroundColor Green
    Write-Host "Request ID: $($createResponse.id)" -ForegroundColor Cyan
    
    Write-Host "All tests passed! API is working!" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}