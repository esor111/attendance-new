# Quick Database Seeding Script
# Seeds test data directly via PostgreSQL connection

param(
    [string]$DatabaseHost = "localhost",
    [string]$DatabasePort = "5432", 
    [string]$DatabaseName = "attendance_db",
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = "password"
)

Write-Host "🗄️ Quick Database Seeding for API Testing" -ForegroundColor Cyan

# Check if psql is available
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL client found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL client (psql) not found in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client or run the SQL manually" -ForegroundColor Yellow
    Write-Host "SQL file: seed-test-user.sql" -ForegroundColor Gray
    exit 1
}

# Connection string
$connectionString = "postgresql://$DatabaseUser:$DatabasePassword@$DatabaseHost:$DatabasePort/$DatabaseName"

Write-Host "`n📊 Seeding test data..." -ForegroundColor Blue
Write-Host "Database: $DatabaseName on $DatabaseHost:$DatabasePort" -ForegroundColor Gray

try {
    # Run the SQL seeding script
    $result = psql $connectionString -f "seed-test-user.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database seeding completed successfully!" -ForegroundColor Green
        Write-Host "`n📋 Seeded Data:" -ForegroundColor Cyan
        Write-Host "   - Test User: afc70db3-6f43-4882-92fd-4715f25ffc95" -ForegroundColor Gray
        Write-Host "   - External ID: U-8C695E" -ForegroundColor Gray
        Write-Host "   - Email: test.user@company.com" -ForegroundColor Gray
        Write-Host "   - Department: Test Department" -ForegroundColor Gray
        Write-Host "   - Entity: Test Company" -ForegroundColor Gray
        
        Write-Host "`n🚀 Ready for API testing!" -ForegroundColor Green
        Write-Host "Run: powershell -ExecutionPolicy Bypass -File seed-and-test.ps1" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Database seeding failed" -ForegroundColor Red
        Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running database seeding:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`n💡 Manual Alternative:" -ForegroundColor Yellow
    Write-Host "Connect to your database and run: seed-test-user.sql" -ForegroundColor Gray
}