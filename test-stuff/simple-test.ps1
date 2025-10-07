# Simple PowerShell API Test
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BASE_URL = "http://localhost:3000"

Write-Host "🚀 Testing API with PowerShell..." -ForegroundColor Cyan

try {
    $headers = @{
        "Authorization" = "Bearer $AUTH_TOKEN"
        "Content-Type" = "application/json"
    }
    
    Write-Host "📡 Testing server connection..." -ForegroundColor Blue
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/requests" -Method GET -Headers $headers
    Write-Host "✅ Server is responding!" -ForegroundColor Green
    Write-Host "Found $($response.Count) requests" -ForegroundColor Cyan
    
    Write-Host "`n🧪 Creating a test leave request..." -ForegroundColor Blue
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
    
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/api/requests/leave" -Method POST -Headers $headers -Body ($leaveRequest | ConvertTo-Json -Depth 10)
    Write-Host "✅ Leave request created with ID: $($createResponse.id)" -ForegroundColor Green
    
    Write-Host "`n🎉 All tests passed! Your API is working perfectly!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}