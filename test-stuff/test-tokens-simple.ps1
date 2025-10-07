# Simple Token Comparison Test

$USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BUSINESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiYnVzaW5lc3NJZCI6ImMxOTlhYzkwLTdiNTEtNDJlMC04Y2FhLWEyNGM0NWUyYzMwZiIsImlhdCI6MTc1NzkwMjYwNX0.Z2yYPOxjJYTwEpz4vnnG7Z5IpLE1FsUECDn9GvKdLIE"
$BASE_URL = "http://localhost:3013"

function Test-Token {
    param($Name, $Token)
    
    Write-Host "`nTesting: $Name" -ForegroundColor Blue
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/kattendance/api/v1/api/requests" -Method GET -Headers $headers
        Write-Host "SUCCESS: $Name works for API access" -ForegroundColor Green
        Write-Host "Found: $($response.Count) requests" -ForegroundColor Cyan
        return $true
    } catch {
        Write-Host "FAILED: $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "TOKEN COMPARISON TEST" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor White

$userWorks = Test-Token "USER TOKEN" $USER_TOKEN
$businessWorks = Test-Token "BUSINESS TOKEN" $BUSINESS_TOKEN

Write-Host "`nRESULTS:" -ForegroundColor White
Write-Host "User Token: $(if($userWorks){'WORKING'}else{'FAILED'})" -ForegroundColor $(if($userWorks){'Green'}else{'Red'})
Write-Host "Business Token: $(if($businessWorks){'WORKING'}else{'FAILED'})" -ForegroundColor $(if($businessWorks){'Green'}else{'Red'})

Write-Host "`nTOKEN DIFFERENCES:" -ForegroundColor Yellow
Write-Host "USER TOKEN:" -ForegroundColor Green
Write-Host "  - Basic user authentication" -ForegroundColor Gray
Write-Host "  - Personal operations only" -ForegroundColor Gray
Write-Host "  - No business context" -ForegroundColor Gray

Write-Host "`nBUSINESS TOKEN:" -ForegroundColor Green  
Write-Host "  - User authentication + Business context" -ForegroundColor Gray
Write-Host "  - Can access business operations" -ForegroundColor Gray
Write-Host "  - Multi-tenant support" -ForegroundColor Gray
Write-Host "  - Business ID: c199ac90-7b51-42e0-8caa-a24c45e2c30f" -ForegroundColor Gray

Write-Host "`nWHEN TO USE:" -ForegroundColor Yellow
Write-Host "User Token: Individual user operations" -ForegroundColor Gray
Write-Host "Business Token: Manager/business operations" -ForegroundColor Gray

Write-Host "`n" + "=" * 40 -ForegroundColor White