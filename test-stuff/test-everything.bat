@echo off
REM 🚀 One-Command API Testing Script for Windows
REM Tests everything to ensure your unified request system works seamlessly

echo 🚀 Starting Complete API Testing...
echo ==================================

REM Check if server is running
echo 📡 Checking if server is running...
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is running
) else (
    echo ⚠️  Server not responding on port 3000
    echo 🔄 Please start your server with: npm run start:dev
    echo Then run this script again
    pause
    exit /b 1
)

REM Check dependencies
echo 📦 Checking dependencies...
npm list axios >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing required dependencies...
    npm install axios colors
)

REM Run the comprehensive API tests
echo 🧪 Running comprehensive API tests...
echo ==================================

node test-apis-now.js

REM Check result
if %errorlevel% equ 0 (
    echo ==================================
    echo 🎉 ALL TESTS PASSED! Your unified request system is working perfectly!
    echo ✅ Authentication works
    echo ✅ All request types can be created
    echo ✅ Manager workflows function
    echo ✅ Statistics are generated
    echo ✅ Error handling is robust
) else (
    echo ==================================
    echo ❌ Some tests failed. Check the output above for details.
    echo 💡 Common fixes:
    echo    - Ensure database is running
    echo    - Run database migrations
    echo    - Check server logs for errors
)

pause