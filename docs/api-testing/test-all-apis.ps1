# Attendance Microservice API Testing Script (PowerShell)
# This script tests all APIs in the correct sequence with ID capturing

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$OutputDir = "./api-responses"
)

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$LogFile = "$OutputDir/api-test.log"

# Logging functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
    Write-Log $Message "SUCCESS"
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
    Write-Log $Message "ERROR"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
    Write-Log $Message "WARNING"
}

# Function to make API calls
function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [string]$AuthToken = $null,
        [string]$OutputFile
    )
    
    $uri = "$BaseUrl$Endpoint"
    $headers = @{
        'Content-Type' = 'application/json'
    }
    
    if ($AuthToken) {
        $headers['Authorization'] = "Bearer $AuthToken"
    }
    
    Write-Log "Calling: $Method $Endpoint"
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $Body
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        
        # Save response to file
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath "$OutputDir/$OutputFile" -Encoding UTF8
        
        Write-Success "API call successful"
        return $response
    }
    catch {
        Write-Error "API call failed: $($_.Exception.Message)"
        $_.Exception.Message | Out-File -FilePath "$OutputDir/$OutputFile" -Encoding UTF8
        return $null
    }
}

# Function to extract ID from response
function Get-IdFromResponse {
    param(
        [string]$ResponseFile,
        [string]$IdField = "id"
    )
    
    try {
        $content = Get-Content "$OutputDir/$ResponseFile" -Raw | ConvertFrom-Json
        return $content.$IdField
    }
    catch {
        return $null
    }
}

# Start testing
Write-Host "🚀 Starting Attendance Microservice API Testing" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan

# Variables to store captured IDs
$DEPT_ID = ""
$MAIN_OFFICE_ID = ""
$CLIENT_SITE_ID = ""
$MANAGER_ID = ""
$OFFICE_WORKER_ID = ""
$FIELD_WORKER_ID = ""

Write-Host "`n=================================================="
Write-Host "PHASE 1: FOUNDATION DATA SETUP"
Write-Host "=================================================="

# Step 1: Create Department
Write-Log "Step 1: Creating Department"
$deptBody = @{
    name = "Engineering Department"
    description = "Software development team"
} | ConvertTo-Json

$deptResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/departments" -Body $deptBody -OutputFile "dept_response.json"
if ($deptResponse) {
    $DEPT_ID = Get-IdFromResponse "dept_response.json"
    Write-Success "Department created with ID: $DEPT_ID"
} else {
    Write-Error "Failed to create department"
    exit 1
}

# Step 2: Create Main Office Entity
Write-Log "Step 2: Creating Main Office Entity"
$mainOfficeBody = @{
    name = "Main Office Kathmandu"
    kahaId = "KTM-MAIN-001"
    latitude = 27.7172
    longitude = 85.3240
    radiusMeters = 100
    address = "Kathmandu Plaza, Kamaladi, Kathmandu"
    description = "Main headquarters building"
} | ConvertTo-Json

$mainOfficeResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/entities" -Body $mainOfficeBody -OutputFile "main_office_response.json"
if ($mainOfficeResponse) {
    $MAIN_OFFICE_ID = Get-IdFromResponse "main_office_response.json"
    Write-Success "Main Office created with ID: $MAIN_OFFICE_ID"
} else {
    Write-Error "Failed to create main office"
    exit 1
}

# Step 3: Create Client Site Entity
Write-Log "Step 3: Creating Client Site Entity"
$clientSiteBody = @{
    name = "Client Site ABC Corp"
    kahaId = "CLIENT-ABC-001"
    latitude = 27.6588
    longitude = 85.3247
    radiusMeters = 150
    address = "Lalitpur Business Center, Lalitpur"
    description = "ABC Corporation client office"
} | ConvertTo-Json

$clientSiteResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/entities" -Body $clientSiteBody -OutputFile "client_site_response.json"
if ($clientSiteResponse) {
    $CLIENT_SITE_ID = Get-IdFromResponse "client_site_response.json"
    Write-Success "Client Site created with ID: $CLIENT_SITE_ID"
} else {
    Write-Error "Failed to create client site"
    exit 1
}

# Step 4a: Create Manager User
Write-Log "Step 4a: Creating Manager User"
$managerBody = @{
    name = "John Manager"
    phone = "+9779812345678"
    email = "john.manager@company.com"
    address = "Kathmandu, Nepal"
    userId = "manager-001"
    isFieldWorker = $false
    departmentId = $DEPT_ID
} | ConvertTo-Json

$managerResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/users" -Body $managerBody -OutputFile "manager_response.json"
if ($managerResponse) {
    $MANAGER_ID = Get-IdFromResponse "manager_response.json"
    Write-Success "Manager created with ID: $MANAGER_ID"
} else {
    Write-Error "Failed to create manager"
    exit 1
}

# Step 4b: Create Office Worker User
Write-Log "Step 4b: Creating Office Worker User"
$officeWorkerBody = @{
    name = "Alice Worker"
    phone = "+9779812345679"
    email = "alice.worker@company.com"
    address = "Kathmandu, Nepal"
    userId = "worker-001"
    isFieldWorker = $false
    departmentId = $DEPT_ID
} | ConvertTo-Json

$officeWorkerResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/users" -Body $officeWorkerBody -OutputFile "office_worker_response.json"
if ($officeWorkerResponse) {
    $OFFICE_WORKER_ID = Get-IdFromResponse "office_worker_response.json"
    Write-Success "Office Worker created with ID: $OFFICE_WORKER_ID"
} else {
    Write-Error "Failed to create office worker"
    exit 1
}

# Step 4c: Create Field Worker User
Write-Log "Step 4c: Creating Field Worker User"
$fieldWorkerBody = @{
    name = "Bob FieldWorker"
    phone = "+9779812345680"
    email = "bob.field@company.com"
    address = "Kathmandu, Nepal"
    userId = "field-001"
    isFieldWorker = $true
    departmentId = $DEPT_ID
} | ConvertTo-Json

$fieldWorkerResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/users" -Body $fieldWorkerBody -OutputFile "field_worker_response.json"
if ($fieldWorkerResponse) {
    $FIELD_WORKER_ID = Get-IdFromResponse "field_worker_response.json"
    Write-Success "Field Worker created with ID: $FIELD_WORKER_ID"
} else {
    Write-Error "Failed to create field worker"
    exit 1
}

Write-Host "`n=================================================="
Write-Host "PHASE 2: CORE ATTENDANCE TESTING"
Write-Host "=================================================="

# Step 5: Office Worker Clock-In
Write-Log "Step 5: Office Worker Clock-In"
$clockInBody = @{
    latitude = 27.7175
    longitude = 85.3245
    notes = "Starting work day"
} | ConvertTo-Json

$clockInResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/clock-in" -Body $clockInBody -OutputFile "office_worker_clock_in.json"
if ($clockInResponse) {
    $ATTENDANCE_ID_1 = Get-IdFromResponse "office_worker_clock_in.json"
    Write-Success "Office Worker clocked in with Attendance ID: $ATTENDANCE_ID_1"
} else {
    Write-Warning "Failed office worker clock-in (might need JWT auth or server not running)"
}

# Step 6: Session Check-In
Write-Log "Step 6: Session Check-In (Break)"
$sessionCheckInBody = @{
    latitude = 27.7173
    longitude = 85.3241
    sessionType = "break"
    notes = "Coffee break"
} | ConvertTo-Json

$sessionResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/session/check-in" -Body $sessionCheckInBody -OutputFile "session_check_in.json"
if ($sessionResponse) {
    $SESSION_ID_1 = Get-IdFromResponse "session_check_in.json"
    Write-Success "Session check-in successful with Session ID: $SESSION_ID_1"
} else {
    Write-Warning "Failed session check-in (might need JWT auth)"
}

# Step 7: Session Check-Out
Write-Log "Step 7: Session Check-Out"
$sessionCheckOutBody = @{
    latitude = 27.7174
    longitude = 85.3242
    notes = "Break finished"
} | ConvertTo-Json

$sessionCheckOutResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/session/check-out" -Body $sessionCheckOutBody -OutputFile "session_check_out.json"
if ($sessionCheckOutResponse) {
    Write-Success "Session check-out successful"
} else {
    Write-Warning "Failed session check-out (might need JWT auth)"
}

# Step 8: Location Check-In
Write-Log "Step 8: Field Worker Location Check-In"
$locationCheckInBody = @{
    entityId = $CLIENT_SITE_ID
    latitude = 27.6590
    longitude = 85.3250
    purpose = "Client meeting"
    notes = "Meeting with ABC Corp about project requirements"
} | ConvertTo-Json

$locationResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/location/check-in" -Body $locationCheckInBody -OutputFile "location_check_in.json"
if ($locationResponse) {
    $LOCATION_LOG_ID_1 = Get-IdFromResponse "location_check_in.json"
    Write-Success "Location check-in successful with Location Log ID: $LOCATION_LOG_ID_1"
} else {
    Write-Warning "Failed location check-in (might need JWT auth)"
}

# Step 9: Location Check-Out
Write-Log "Step 9: Location Check-Out"
$locationCheckOutBody = @{
    latitude = 27.6592
    longitude = 85.3252
    notes = "Meeting completed successfully"
} | ConvertTo-Json

$locationCheckOutResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/location/check-out" -Body $locationCheckOutBody -OutputFile "location_check_out.json"
if ($locationCheckOutResponse) {
    Write-Success "Location check-out successful"
} else {
    Write-Warning "Failed location check-out (might need JWT auth)"
}

Write-Host "`n=================================================="
Write-Host "PHASE 3: QUERY TESTING"
Write-Host "=================================================="

# Step 10: Get Today's Attendance
Write-Log "Step 10: Get Today's Attendance"
$todayResponse = Invoke-ApiCall -Method "GET" -Endpoint "/api/attendance/today" -OutputFile "today_attendance.json"
if ($todayResponse) {
    Write-Success "Retrieved today's attendance"
} else {
    Write-Warning "Failed to get today's attendance (might need JWT auth)"
}

# Step 11: Find Nearby Entities
Write-Log "Step 11: Find Nearby Entities"
$nearbyResponse = Invoke-ApiCall -Method "GET" -Endpoint "/api/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000" -OutputFile "nearby_entities.json"
if ($nearbyResponse) {
    Write-Success "Retrieved nearby entities"
} else {
    Write-Warning "Failed to get nearby entities"
}

# Step 12: Clock-Out
Write-Log "Step 12: Clock-Out"
$clockOutBody = @{
    latitude = 27.7176
    longitude = 85.3244
    notes = "End of work day"
} | ConvertTo-Json

$clockOutResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/clock-out" -Body $clockOutBody -OutputFile "clock_out.json"
if ($clockOutResponse) {
    Write-Success "Clock-out successful"
} else {
    Write-Warning "Failed clock-out (might need JWT auth)"
}

Write-Host "`n=================================================="
Write-Host "ERROR TESTING"
Write-Host "=================================================="

# Step 13: Test Clock-In Outside Radius (Should Fail)
Write-Log "Step 13: Testing Clock-In Outside Radius (Should Fail)"
$outsideRadiusBody = @{
    latitude = 28.2096
    longitude = 83.9856
    notes = "Trying to clock in from Pokhara (200km away)"
} | ConvertTo-Json

$outsideRadiusResponse = Invoke-ApiCall -Method "POST" -Endpoint "/api/attendance/clock-in" -Body $outsideRadiusBody -OutputFile "clock_in_outside_radius.json"
if ($outsideRadiusResponse) {
    Write-Warning "Clock-in outside radius succeeded (should have failed)"
} else {
    Write-Success "Clock-in outside radius correctly failed"
}

Write-Host "`n=================================================="
Write-Host "TESTING SUMMARY"
Write-Host "=================================================="

Write-Host "🎉 API Testing Completed!" -ForegroundColor Green
Write-Host "📊 Summary of Captured IDs:" -ForegroundColor Cyan
Write-Host "   Department ID: $DEPT_ID" -ForegroundColor White
Write-Host "   Main Office ID: $MAIN_OFFICE_ID" -ForegroundColor White
Write-Host "   Client Site ID: $CLIENT_SITE_ID" -ForegroundColor White
Write-Host "   Manager ID: $MANAGER_ID" -ForegroundColor White
Write-Host "   Office Worker ID: $OFFICE_WORKER_ID" -ForegroundColor White
Write-Host "   Field Worker ID: $FIELD_WORKER_ID" -ForegroundColor White

# Create summary file
$capturedIds = @{
    departmentId = $DEPT_ID
    mainOfficeId = $MAIN_OFFICE_ID
    clientSiteId = $CLIENT_SITE_ID
    managerId = $MANAGER_ID
    officeWorkerId = $OFFICE_WORKER_ID
    fieldWorkerId = $FIELD_WORKER_ID
    testTimestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$capturedIds | ConvertTo-Json -Depth 10 | Out-File -FilePath "$OutputDir/captured_ids.json" -Encoding UTF8

Write-Success "✅ Captured IDs saved to: $OutputDir/captured_ids.json"
Write-Host "📁 All responses saved in: $OutputDir" -ForegroundColor Cyan
Write-Host "📝 Full log available in: $LogFile" -ForegroundColor Cyan

Write-Host "`n🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check responses in $OutputDir directory"
Write-Host "2. Implement JWT authentication for protected endpoints"
Write-Host "3. Run individual API tests using captured IDs"
Write-Host "4. Test error scenarios and edge cases"
Write-Host "`n📋 To run specific tests, use the captured IDs from captured_ids.json"