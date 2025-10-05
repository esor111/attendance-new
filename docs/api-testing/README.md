# Attendance Microservice API Testing

This directory contains comprehensive API testing tools for the Attendance Microservice. The tests are designed to run in the correct sequence, handling data dependencies and ID capturing automatically.

## 🚀 Quick Start

### Prerequisites
- Attendance microservice running on `http://localhost:3000`
- PostgreSQL database setup and running
- Node.js installed (for Node.js runner)
- PowerShell (for Windows users)

### Option 1: Node.js Test Runner (Recommended - Cross Platform)
```bash
# Navigate to testing directory
cd docs/api-testing

# Run the tests
node test-runner.js

# Or using npm
npm test
```

### Option 2: PowerShell Script (Windows)
```powershell
# Navigate to testing directory
cd docs/api-testing

# Run PowerShell script
powershell -ExecutionPolicy Bypass -File test-all-apis.ps1

# Or using npm
npm run test:powershell
```

### Option 3: Bash Script (Linux/Mac)
```bash
# Navigate to testing directory
cd docs/api-testing

# Make executable and run
chmod +x test-all-apis.sh
./test-all-apis.sh

# Or using npm
npm run test:bash
```

### Option 4: Manual cURL Testing
```bash
# Follow the manual testing guide
# See manual-curl-tests.md for copy-paste ready commands
```

## 📁 Files Overview

| File | Description |
|------|-------------|
| `test-runner.js` | Cross-platform Node.js test runner |
| `test-all-apis.ps1` | PowerShell script for Windows |
| `test-all-apis.sh` | Bash script for Linux/Mac |
| `manual-curl-tests.md` | Manual cURL commands |
| `api-test-sequence.md` | Detailed testing documentation |
| `package.json` | NPM configuration for test scripts |

## 🔄 Testing Sequence

The tests follow this logical sequence to handle data dependencies:

### Phase 1: Foundation Data Setup
1. **Create Department** → Captures `departmentId`
2. **Create Main Office Entity** → Captures `mainOfficeId`
3. **Create Client Site Entity** → Captures `clientSiteId`
4. **Create Users** (Manager, Office Worker, Field Worker) → Captures user IDs

### Phase 2: Relationships Setup
5. **Department-Entity Assignments** (if implemented)
6. **User-Entity Assignments** (if implemented)
7. **Reporting Structure** (if implemented)

### Phase 3: Core Attendance Testing
8. **Clock-In** → Test basic attendance functionality
9. **Session Check-In/Out** → Test break/meeting management
10. **Location Check-In/Out** → Test field worker functionality

### Phase 4: Query Testing
11. **Get Today's Attendance** → Verify records
12. **Get Current Session** → Check active sessions
13. **Get Current Location** → Check active locations
14. **Find Nearby Entities** → Test proximity search

### Phase 5: Completion
15. **Clock-Out** → Complete attendance cycle
16. **Get History** → Test historical data
17. **Get Analytics** → Test reporting features

### Phase 6: Error Testing
18. **Clock-In Outside Radius** → Should fail
19. **Duplicate Operations** → Should fail
20. **Invalid Data** → Should fail

## 📊 Output Files

All test results are saved in the `./api-responses/` directory:

```
api-responses/
├── captured_ids.json          # All captured IDs for reference
├── api-test.log               # Complete test log
├── dept_response.json         # Department creation response
├── main_office_response.json  # Main office creation response
├── client_site_response.json  # Client site creation response
├── manager_response.json      # Manager user creation response
├── office_worker_response.json # Office worker creation response
├── field_worker_response.json # Field worker creation response
├── office_worker_clock_in.json # Clock-in response
├── session_check_in.json      # Session check-in response
├── location_check_in.json     # Location check-in response
├── today_attendance.json      # Today's attendance query
├── nearby_entities.json       # Nearby entities query
└── ... (other response files)
```

## 🔧 Configuration

### Environment Variables
```bash
# Base URL for the API (default: http://localhost:3000)
export BASE_URL=http://localhost:3000

# Output directory (default: ./api-responses)
export OUTPUT_DIR=./api-responses
```

### PowerShell Parameters
```powershell
# Run with custom base URL
.\test-all-apis.ps1 -BaseUrl "http://localhost:4000" -OutputDir "./custom-responses"
```

## 🎯 Test Coordinates

The tests use these specific coordinates for validation:

| Location | Latitude | Longitude | Purpose |
|----------|----------|-----------|---------|
| Main Office (Kathmandu) | 27.7172 | 85.3240 | Primary office location |
| Client Site (Lalitpur) | 27.6588 | 85.3247 | Field worker client site |
| Test Location (Near Office) | 27.7175 | 85.3245 | Within radius testing |
| Error Location (Pokhara) | 28.2096 | 83.9856 | Outside radius testing |

## 🔐 Authentication Notes

Currently, the tests run without JWT authentication for initial testing. For production testing:

1. **Implement JWT token generation**
2. **Add authentication headers to requests**
3. **Test role-based access control**

Example with authentication:
```javascript
const authToken = "your-jwt-token-here";
await apiCall('POST', '/api/attendance/clock-in', data, authToken);
```

## ❌ Troubleshooting

### Common Issues

#### 1. Server Not Running
```
❌ API call error: connect ECONNREFUSED 127.0.0.1:3000
```
**Solution**: Start the attendance microservice server

#### 2. Database Connection Issues
```
❌ API call failed (500): Internal server error
```
**Solution**: Ensure PostgreSQL is running and properly configured

#### 3. JWT Authentication Required
```
❌ API call failed (401): Unauthorized
```
**Solution**: Either disable JWT guards for testing or implement token generation

#### 4. Validation Errors
```
❌ API call failed (400): Validation failed
```
**Solution**: Check the response details in the saved JSON files

### Debug Mode

For detailed debugging, check the log files:
```bash
# View the complete log
cat api-responses/api-test.log

# View specific response
cat api-responses/dept_response.json | jq '.'

# Check captured IDs
cat api-responses/captured_ids.json | jq '.'
```

## 🧪 Individual API Testing

After running the full test suite, you can use the captured IDs for individual testing:

```bash
# Load captured IDs
DEPT_ID=$(cat api-responses/captured_ids.json | jq -r '.departmentId')
ENTITY_ID=$(cat api-responses/captured_ids.json | jq -r '.mainOfficeId')

# Test specific endpoint
curl -X GET "http://localhost:3000/api/departments/$DEPT_ID" | jq '.'
```

## 📈 Success Criteria

A successful test run should show:
- ✅ All foundation data created (departments, entities, users)
- ✅ Clock-in successful with location validation
- ✅ Session management working
- ✅ Location logging functional (for field workers)
- ✅ Query endpoints returning data
- ✅ Clock-out completing the cycle
- ❌ Error scenarios properly rejected

## 🔄 Continuous Testing

For continuous integration, you can run these tests as part of your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Run API Tests
  run: |
    cd docs/api-testing
    node test-runner.js
    
- name: Upload Test Results
  uses: actions/upload-artifact@v2
  with:
    name: api-test-results
    path: docs/api-testing/api-responses/
```

## 📞 Support

If you encounter issues:
1. Check the log files in `api-responses/`
2. Verify server is running and database is connected
3. Review the API documentation
4. Check for authentication requirements
5. Validate coordinate ranges and data formats

Happy testing! 🚀