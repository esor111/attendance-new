# Unified Request System Testing Guide

This comprehensive testing suite validates the unified request system that consolidates leave requests, remote work requests, and attendance correction requests into a single, streamlined API.

## 🎯 Testing Strategy

### Smart Testing Approach
Our testing strategy follows a **smart, layered approach** that ensures comprehensive coverage while being efficient:

1. **Migration Validation** - Ensures data integrity during consolidation
2. **API Functionality** - Tests all endpoints systematically  
3. **Business Logic** - Validates request-specific rules and workflows
4. **End-to-End Workflows** - Tests complete user journeys
5. **Edge Cases & Error Handling** - Ensures robust error management

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Setup test database
npm run db:test:setup

# Run database migrations
npm run db:test:migrate
```

### Run Tests

#### Smart Test Execution (Recommended)
```bash
# Intelligent test execution with automatic flow
npm run test:requests smart
```

#### Quick Validation
```bash
# Fast validation of core functionality
npm run test:requests quick
```

#### Full Regression Testing
```bash
# Complete test suite for thorough validation
npm run test:requests regression
```

#### Custom Test Execution
```bash
# Run specific test suites
npm run test:requests custom migration api-basic

# Run specific scenarios
npm run test:requests custom -- --scenario validation
```

## 📋 Test Suites Overview

### 1. Migration Tests (`migration`)
**Purpose**: Validates data migration from separate request tables to unified system

**Key Tests**:
- Migration status checking
- Data integrity validation
- Rollback capability
- Performance during migration

**Command**: `npm run test:requests custom migration`

### 2. Basic API Tests (`api-basic`)
**Purpose**: Tests fundamental API functionality

**Key Tests**:
- Authentication and authorization
- Request creation (all types)
- Request retrieval and filtering
- Basic CRUD operations

**Command**: `npm run test:requests custom api-basic`

### 3. Advanced API Tests (`api-advanced`)
**Purpose**: Tests complex API features and business logic

**Key Tests**:
- Request validation logic
- Manager approval workflows
- Statistics and analytics
- Type-specific business rules

**Command**: `npm run test:requests custom api-advanced`

### 4. Edge Cases & Error Handling (`edge-cases`)
**Purpose**: Tests error scenarios and boundary conditions

**Key Tests**:
- Invalid request data handling
- Authorization failures
- Rate limiting and timeouts
- Performance under load

**Command**: `npm run test:requests custom edge-cases`

### 5. Complete Workflows (`full-workflow`)
**Purpose**: End-to-end testing of complete user journeys

**Key Tests**:
- Complete leave request lifecycle
- Remote work approval process
- Attendance correction workflow
- Multi-user interaction scenarios

**Command**: `npm run test:requests custom full-workflow`

## 🔧 Test Configuration

### Environment Setup
Tests use the configuration in `tests/test-config.json`:

```json
{
  "testEnvironment": {
    "database": {
      "host": "localhost",
      "port": 5432,
      "database": "attendance_test"
    },
    "auth": {
      "testUsers": [
        {
          "email": "employee@company.com",
          "role": "employee"
        },
        {
          "email": "manager@company.com",
          "role": "manager"
        }
      ]
    }
  }
}
```

### Test Data Management
- **Automatic Setup**: Test users and sample data created automatically
- **Isolation**: Each test suite runs in isolation
- **Cleanup**: Automatic cleanup after test completion
- **Preservation**: Option to preserve test data for debugging

## 📊 Test Coverage

### API Endpoints Tested

#### Unified Request Endpoints
- `POST /api/requests` - Create any request type
- `GET /api/requests` - Get user requests with filtering
- `GET /api/requests/:id` - Get specific request
- `POST /api/requests/:id/approve` - Approve/reject request
- `POST /api/requests/:id/cancel` - Cancel request
- `DELETE /api/requests/:id` - Delete request

#### Type-Specific Endpoints
- `POST /api/requests/leave` - Create leave request
- `POST /api/requests/remote-work` - Create remote work request
- `POST /api/requests/attendance-correction` - Create attendance correction

#### Management Endpoints
- `GET /api/requests/pending/approval` - Pending requests for managers
- `GET /api/requests/team/all` - Team requests for managers
- `GET /api/requests/stats/summary` - Request statistics

#### Migration Endpoints
- `POST /api/migration/consolidate-requests` - Execute migration
- `GET /api/migration/consolidate-requests/status` - Migration status

### Business Logic Tested

#### Leave Requests
- ✅ Leave balance validation
- ✅ Advance notice requirements
- ✅ Overlapping request detection
- ✅ Emergency leave handling
- ✅ Balance updates after approval/rejection

#### Remote Work Requests
- ✅ 24-hour advance notice requirement
- ✅ Weekly limit validation (max 2 days/week)
- ✅ Duplicate request prevention
- ✅ Manager approval workflow

#### Attendance Corrections
- ✅ Time limit validation (30 days max)
- ✅ Future date prevention
- ✅ Existing attendance conflict detection
- ✅ Automatic attendance record creation
- ✅ Request deadline management

## 🧪 Test Scenarios

### Scenario 1: Complete Leave Request Workflow
```
1. Employee checks leave balance
2. Employee validates request before submission
3. Employee submits leave request
4. Manager sees pending request
5. Manager approves request
6. Employee sees approval
7. Leave balance is updated
8. Statistics are updated
```

### Scenario 2: Remote Work Request with Weekly Limit
```
1. Employee checks current week's requests
2. Employee submits first remote work request
3. Employee submits second remote work request
4. Employee tries third request (should fail)
5. Manager approves valid requests
6. Weekly statistics are updated
```

### Scenario 3: Attendance Correction with Validation
```
1. Employee checks attendance history
2. Employee submits correction for valid date
3. System validates date is within limits
4. Manager reviews and approves
5. Attendance record is automatically created
6. Record is flagged for review
```

## 🔍 Debugging Tests

### Running Individual Tests
```bash
# Run specific test file
npm test -- --testPathPattern="leave-workflow.e2e-spec.ts"

# Run specific test case
npm test -- --testNamePattern="Complete Leave Request Lifecycle"

# Run with verbose output
npm test -- --verbose --testPathPattern="unified-request-system.e2e-spec.ts"
```

### Test Data Inspection
```bash
# Preserve test data for inspection
npm run test:requests custom -- --preserve-data

# View test database
npm run db:test:connect
```

### Debug Mode
```bash
# Run tests in debug mode
npm run test:requests:debug

# Run with detailed logging
DEBUG=* npm run test:requests smart
```

## 📈 Performance Testing

### Load Testing
```bash
# Test with concurrent users
npm run test:requests:load --users=10 --duration=60s

# Test specific endpoints under load
npm run test:requests:load --endpoint="/api/requests" --rps=100
```

### Performance Benchmarks
- **Request Creation**: < 200ms response time
- **Request Retrieval**: < 100ms response time
- **Statistics Generation**: < 500ms response time
- **Migration Execution**: < 30s for 10k records

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
npm run db:test:status

# Reset test database
npm run db:test:reset
```

#### Authentication Failures
```bash
# Verify test users exist
npm run test:users:verify

# Reset test user passwords
npm run test:users:reset
```

#### Migration Issues
```bash
# Check migration status
curl -X GET http://localhost:3000/api/migration/consolidate-requests/status

# Rollback migration if needed
curl -X POST http://localhost:3000/api/migration/consolidate-requests/rollback
```

### Test Environment Issues

#### Port Conflicts
```bash
# Use different port for tests
TEST_PORT=3001 npm run test:requests smart
```

#### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run test:requests regression
```

## 📝 Test Reports

### Generating Reports
```bash
# Generate HTML report
npm run test:requests:report

# Generate JSON report for CI/CD
npm run test:requests:report --format=json

# Generate coverage report
npm run test:requests:coverage
```

### Report Contents
- **Test Results**: Pass/fail status for each test
- **Performance Metrics**: Response times and throughput
- **Coverage Analysis**: Code coverage percentages
- **Error Analysis**: Detailed error logs and stack traces

## 🔄 Continuous Integration

### CI/CD Pipeline Integration
```yaml
# Example GitHub Actions workflow
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Setup test database
        run: npm run db:test:setup
      - name: Run smart tests
        run: npm run test:requests smart
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

## 🎯 Best Practices

### Writing New Tests
1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should explain what they validate
3. **Test One Thing**: Each test should validate a single behavior
4. **Clean Up**: Always clean up test data after tests
5. **Use Realistic Data**: Test with data that resembles production

### Test Maintenance
1. **Regular Updates**: Keep tests updated with API changes
2. **Performance Monitoring**: Monitor test execution times
3. **Flaky Test Management**: Identify and fix unstable tests
4. **Documentation**: Keep test documentation current

## 📚 Additional Resources

- [API Documentation](../docs/api-documentation.md)
- [Database Schema](../docs/database-schema.md)
- [Migration Guide](../docs/migration-guide.md)
- [Troubleshooting Guide](../docs/troubleshooting.md)

## 🤝 Contributing

When adding new tests:
1. Follow the existing test structure
2. Add tests to appropriate test suites
3. Update this documentation
4. Ensure tests pass in CI/CD pipeline
5. Add performance benchmarks for new endpoints

---

**Happy Testing! 🚀**

The unified request system testing suite ensures that all functionality works seamlessly across different request types while maintaining data integrity and providing excellent user experience.