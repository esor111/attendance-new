# 🚀 Quick API Testing Setup

## Immediate Testing - Get Results in 2 Minutes!

### Step 1: Install Dependencies (if needed)
```bash
npm install axios colors
```

### Step 2: Start Your Server
```bash
# Make sure your server is running
npm run start:dev
# or
npm start
```

### Step 3: Run the API Tests
```bash
# Test everything immediately
node test-apis-now.js

# Or test against different URL
node test-apis-now.js http://localhost:4000
```

## 🎯 What Gets Tested

### ✅ **Authentication & Security**
- Employee login
- Manager login  
- Unauthorized access handling

### ✅ **Migration System**
- Migration status check
- Data consolidation validation

### ✅ **Request Creation (All Types)**
- Leave requests via `/api/requests/leave`
- Remote work requests via `/api/requests/remote-work`
- Attendance corrections via `/api/requests/attendance-correction`
- Generic requests via `/api/requests`

### ✅ **Request Retrieval & Filtering**
- Get all user requests
- Filter by request type
- Filter by date range
- Get specific request by ID

### ✅ **Request Validation**
- Valid request validation
- Invalid request rejection
- Business rule enforcement

### ✅ **Manager Workflows**
- Get pending requests for approval
- Get team requests
- Approve requests
- Reject requests with reasons

### ✅ **Statistics & Analytics**
- Overall request statistics
- Statistics by request type
- Approval rates and metrics

### ✅ **Request Modifications**
- Cancel pending requests
- Delete requests

### ✅ **Error Handling**
- 404 for non-existent requests
- 400 for invalid data
- 401 for unauthorized access
- Proper error messages

## 📊 Expected Output

```
🚀 Starting Comprehensive API Testing for Unified Request System

[10:30:15] ℹ️  Testing: Employee Authentication
[10:30:15] ✅ PASSED: Employee Authentication
[10:30:15] ℹ️  Testing: Manager Authentication  
[10:30:15] ✅ PASSED: Manager Authentication
[10:30:16] ℹ️  Testing: Check Migration Status
[10:30:16] ✅ PASSED: Check Migration Status
[10:30:16] ℹ️  Testing: Create Leave Request
[10:30:16] ✅ PASSED: Create Leave Request
[10:30:17] ℹ️  Testing: Create Remote Work Request
[10:30:17] ✅ PASSED: Create Remote Work Request
...

============================================================
🧪 API TESTING RESULTS
============================================================
Total Tests: 25
Passed: 25
Failed: 0
Success Rate: 100%

🎉 ALL TESTS PASSED! Your unified request system is working perfectly!
============================================================
```

## 🔧 Troubleshooting

### If Server Not Running
```bash
# Start your NestJS server first
npm run start:dev
```

### If Authentication Fails
The script will use mock tokens and continue testing the API structure.

### If Some Tests Fail
- Check the error messages in the output
- Verify your database is running
- Ensure all migrations are applied
- Check if the unified request endpoints are properly configured

### Common Issues & Solutions

#### Port Issues
```bash
# Test on different port
node test-apis-now.js http://localhost:4000
```

#### Database Issues
```bash
# Check if database is running
# Run any pending migrations
npm run migration:run
```

#### Module Issues
```bash
# Make sure the unified request module is properly imported
# Check that RequestController is registered in AttendanceModule
```

## 🎯 Quick Validation Checklist

After running the tests, verify:

- [ ] ✅ All authentication tests pass
- [ ] ✅ Migration system is working
- [ ] ✅ Can create all request types
- [ ] ✅ Can retrieve and filter requests
- [ ] ✅ Manager workflows function correctly
- [ ] ✅ Statistics are generated properly
- [ ] ✅ Error handling works as expected
- [ ] ✅ Request modifications work (cancel/delete)

## 🚀 Next Steps

If all tests pass:
1. **✅ Your unified request system is working perfectly!**
2. **✅ All API endpoints are functional**
3. **✅ Business logic is properly implemented**
4. **✅ Error handling is robust**

If some tests fail:
1. **🔍 Check the specific error messages**
2. **🛠️ Fix the identified issues**
3. **🔄 Re-run the tests**
4. **📝 Update any missing configurations**

## 📋 Manual Testing (Optional)

You can also test manually using curl or Postman:

### Create Leave Request
```bash
curl -X POST http://localhost:3000/api/requests/leave \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "type": "LEAVE",
    "requestData": {
      "leaveType": "ANNUAL",
      "startDate": "2025-12-20",
      "endDate": "2025-12-22",
      "daysRequested": 3,
      "reason": "Holiday",
      "balanceInfo": {
        "allocatedDays": 25,
        "usedDays": 5,
        "remainingDays": 20
      }
    }
  }'
```

### Get All Requests
```bash
curl -X GET http://localhost:3000/api/requests \\
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Request Statistics
```bash
curl -X GET http://localhost:3000/api/requests/stats/summary \\
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**This testing script validates your entire unified request system in under 2 minutes! 🎉**