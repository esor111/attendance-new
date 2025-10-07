# 🧪 Test Files Collection

This folder contains all the API testing scripts and utilities created during development and testing of the attendance microservice.

## 📋 **File Categories**

### **🚀 Main Test Scripts**
- `final-smart-test.ps1` - **RECOMMENDED** - Comprehensive API testing with smart validation
- `smart-test.ps1` - Basic smart testing with user seeding check
- `test-final.ps1` - Complete API test suite
- `test-simple.ps1` - Simple authentication and basic API test

### **🔐 Authentication & Token Testing**
- `decode-tokens.ps1` - Decode and compare User vs Business tokens
- `test-tokens-simple.ps1` - Test both token types
- `test-both-tokens.ps1` - Comprehensive token comparison
- `test-with-handshake.ps1` - Test with user handshake process

### **🗄️ Database Seeding**
- `seed-user-simple.sql` - **RECOMMENDED** - Simple SQL to seed test user
- `seed-test-user.sql` - Complete user seeding with departments and entities
- `quick-seed-db.ps1` - PowerShell script to run SQL seeding
- `seed-and-test.ps1` - Combined seeding and testing script

### **🔍 Diagnostic & Debug Scripts**
- `test-endpoints.ps1` - Test different endpoint paths
- `test-error-details.ps1` - Detailed error analysis
- `test-detailed.ps1` - Verbose testing with error details
- `test-without-seeding.ps1` - Test what works without database seeding

### **🌐 Cross-Platform Scripts**
- `test-everything.bat` - Windows batch file for testing
- `test-everything.sh` - Linux/Mac shell script for testing
- `test-apis-now.js` - Node.js testing script
- `test-with-real-token.js` - JavaScript version with real token

### **📄 Documentation & Data**
- `swagger.json` - API documentation export
- `README.md` - This file

## 🎯 **Quick Start**

### **For Complete Testing:**
```powershell
# 1. Seed the database (run once)
psql -h localhost -p 5432 -U root -d attendance-management -f seed-user-simple.sql

# 2. Run comprehensive tests
powershell -ExecutionPolicy Bypass -File final-smart-test.ps1
```

### **For Quick Token Testing:**
```powershell
powershell -ExecutionPolicy Bypass -File test-tokens-simple.ps1
```

### **For Basic API Testing:**
```powershell
powershell -ExecutionPolicy Bypass -File test-simple.ps1
```

## 🔧 **Configuration**

All scripts use these default values:
- **Server URL**: `http://localhost:3013`
- **User Token**: Your JWT token from testing
- **Business Token**: Your business JWT token from .env
- **Database**: `attendance-management` on localhost:5432

## 📊 **Test Results**

The scripts test:
- ✅ Authentication (JWT validation)
- ✅ Request creation (all types)
- ✅ Request retrieval and filtering
- ✅ Manager operations
- ✅ Error handling
- ✅ Statistics endpoints
- ✅ Token comparison

## 🚨 **Prerequisites**

1. **Server Running**: Attendance service on port 3013
2. **Database**: PostgreSQL with attendance-management database
3. **User Data**: Run seeding scripts for full functionality

## 💡 **Tips**

- Use `final-smart-test.ps1` for the most comprehensive testing
- Run `seed-user-simple.sql` first if you get 409 Conflict errors
- Check server logs if tests fail unexpectedly
- All scripts are safe to run multiple times

## 🎉 **Success Indicators**

- **100% Success Rate**: All systems working perfectly
- **50-70% Success Rate**: Core system working, needs user seeding
- **<50% Success Rate**: Check server status and configuration