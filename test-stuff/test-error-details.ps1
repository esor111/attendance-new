# Get detailed error information
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BASE_URL = "http://localhost:3013"

$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

$leaveRequest = @{
    type = "LEAVE"
    requestData = @{
        leaveType = "ANNUAL"
        startDate = "2025-12-20"
        endDate = "2025-12-22"
        daysRequested = 3
        reason = "Test request"
        balanceInfo = @{
            allocatedDays = 25
            usedDays = 5
            remainingDays = 20
        }
    }
    notes = "Test"
}

Write-Host "Attempting to create leave request..." -ForegroundColor Blue
Write-Host "Request payload:" -ForegroundColor Cyan
Write-Host ($leaveRequest | ConvertTo-Json -Depth 10) -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests/leave" -Method POST -Headers $headers -Body ($leaveRequest | ConvertTo-Json -Depth 10)
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Cyan
} catch {
    Write-Host "ERROR occurred:" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        # Get the error response body
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Yellow
        
        # Try to parse as JSON for better formatting
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "Formatted Error:" -ForegroundColor Red
            Write-Host ($errorJson | ConvertTo-Json -Depth 10) -ForegroundColor Yellow
        } catch {
            Write-Host "Could not parse error as JSON" -ForegroundColor Gray
        }
    }
}