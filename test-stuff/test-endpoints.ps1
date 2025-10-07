# Test different endpoints to find the right API path
$AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BASE_URL = "http://localhost:3013"

$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

$endpoints = @(
    "/",
    "/health",
    "/api",
    "/api/requests",
    "/requests",
    "/attendance/requests",
    "/api/attendance/requests"
)

Write-Host "Testing different endpoints on port 3013..." -ForegroundColor Cyan

foreach ($endpoint in $endpoints) {
    try {
        Write-Host "Testing: $endpoint" -ForegroundColor Blue
        $response = Invoke-RestMethod -Uri "$BASE_URL$endpoint" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "SUCCESS: $endpoint works!" -ForegroundColor Green
        if ($response -is [array]) {
            Write-Host "  Response: Array with $($response.Count) items" -ForegroundColor Cyan
        } else {
            Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Cyan
        }
        break
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status: $statusCode" -ForegroundColor Yellow
    }
}