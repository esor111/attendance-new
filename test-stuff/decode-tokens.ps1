# Token Decoder - Compare User Token vs Business Token

# Your tokens
$USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE"
$BUSINESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiYnVzaW5lc3NJZCI6ImMxOTlhYzkwLTdiNTEtNDJlMC04Y2FhLWEyNGM0NWUyYzMwZiIsImlhdCI6MTc1NzkwMjYwNX0.Z2yYPOxjJYTwEpz4vnnG7Z5IpLE1FsUECDn9GvKdLIE"

function Decode-JWTPayload {
    param($Token)
    
    # Split JWT into parts
    $parts = $Token.Split('.')
    $payload = $parts[1]
    
    # Add padding if needed
    while ($payload.Length % 4 -ne 0) {
        $payload += "="
    }
    
    # Decode base64
    $bytes = [System.Convert]::FromBase64String($payload)
    $json = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    return $json | ConvertFrom-Json
}

Write-Host "JWT TOKEN COMPARISON" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor White

Write-Host "`nUSER TOKEN:" -ForegroundColor Yellow
$userPayload = Decode-JWTPayload $USER_TOKEN
Write-Host "ID: $($userPayload.id)" -ForegroundColor Green
Write-Host "Kaha ID: $($userPayload.kahaId)" -ForegroundColor Green
Write-Host "Business ID: $($userPayload.businessId)" -ForegroundColor Red
Write-Host "Issued At: $($userPayload.iat)" -ForegroundColor Gray
$userDate = [DateTimeOffset]::FromUnixTimeSeconds($userPayload.iat).ToString("yyyy-MM-dd HH:mm:ss")
Write-Host "Issued Date: $userDate" -ForegroundColor Gray

Write-Host "`nBUSINESS TOKEN:" -ForegroundColor Yellow
$businessPayload = Decode-JWTPayload $BUSINESS_TOKEN
Write-Host "ID: $($businessPayload.id)" -ForegroundColor Green
Write-Host "Kaha ID: $($businessPayload.kahaId)" -ForegroundColor Green
Write-Host "Business ID: $($businessPayload.businessId)" -ForegroundColor Green
Write-Host "Issued At: $($businessPayload.iat)" -ForegroundColor Gray
$businessDate = [DateTimeOffset]::FromUnixTimeSeconds($businessPayload.iat).ToString("yyyy-MM-dd HH:mm:ss")
Write-Host "Issued Date: $businessDate" -ForegroundColor Gray

Write-Host "`nKEY DIFFERENCES:" -ForegroundColor Cyan
Write-Host "User Token: Basic user authentication only" -ForegroundColor Yellow
Write-Host "Business Token: User authentication + Business context" -ForegroundColor Yellow

Write-Host "`nACCESS LEVELS:" -ForegroundColor Cyan
Write-Host "User Token can access:" -ForegroundColor Green
Write-Host "  - All JwtAuthGuard protected endpoints" -ForegroundColor Green
Write-Host "  - Personal requests, attendance, etc." -ForegroundColor Green

Write-Host "`nBusiness Token can access:" -ForegroundColor Green
Write-Host "  - All JwtAuthGuard protected endpoints" -ForegroundColor Green
Write-Host "  - All BusinessAuthGuard protected endpoints" -ForegroundColor Green
Write-Host "  - Business-specific operations" -ForegroundColor Green

Write-Host "`nBUSINESS CONTEXT:" -ForegroundColor Cyan
Write-Host "Business ID: $($businessPayload.businessId)" -ForegroundColor Green
Write-Host "This allows multi-tenant operations" -ForegroundColor Gray

Write-Host "`n" + "=" * 50 -ForegroundColor White