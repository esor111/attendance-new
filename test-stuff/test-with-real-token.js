#!/usr/bin/env node

/**
 * Quick API Test with Real JWT Token
 * Tests the unified request system with your actual authentication token
 */

const axios = require('axios');

// Your actual JWT token and user details
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE';
const USER_ID = 'afc70db3-6f43-4882-92fd-4715f25ffc95';
const KAHA_ID = 'U-8C695E';
const BASE_URL = 'http://localhost:3000';

class QuickAPITest {
  constructor() {
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  log(message, type = 'info') {
    const colors = {
      success: '\x1b[32m✅',
      error: '\x1b[31m❌', 
      warning: '\x1b[33m⚠️',
      info: '\x1b[34mℹ️'
    };
    console.log(`${colors[type] || colors.info} ${message}\x1b[0m`);
  }

  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      timeout: 10000 // 10 second timeout
    };

    if (data) config.data = data;
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Server not running on ${BASE_URL}. Please start with: npm run start:dev`);
      }
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const errorData = error.response.data;
        throw new Error(`HTTP ${status} ${statusText}: ${JSON.stringify(errorData)}`);
      }
      throw error;
    }
  }

  async test(description, testFn) {
    this.results.total++;
    try {
      console.log(`\n🧪 Testing: ${description}`);
      const result = await testFn();
      this.results.passed++;
      this.log(`PASSED: ${description}`, 'success');
      return result;
    } catch (error) {
      this.results.failed++;
      this.log(`FAILED: ${description}`, 'error');
      this.log(`Error: ${error.message}`, 'error');
      if (error.response?.data) {
        this.log(`Details: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
  }

  async runQuickTests() {
    console.log('🚀 Quick API Testing with Real JWT Token\n');
    console.log(`👤 User ID: ${USER_ID}`);
    console.log(`🏷️  Kaha ID: ${KAHA_ID}`);
    console.log(`🌐 Base URL: ${BASE_URL}\n`);

    // Test 1: Check if server is running
    await this.test('Server Health Check', async () => {
      try {
        await axios.get(`${BASE_URL}/health`);
        return 'Server is running';
      } catch (error) {
        // Try a basic endpoint instead
        await this.makeRequest('GET', '/api/requests');
        return 'Server responding to API requests';
      }
    });

    // Test 2: Get all requests
    const requests = await this.test('Get All User Requests', async () => {
      const response = await this.makeRequest('GET', '/api/requests');
      this.log(`Found ${response.length} existing requests`, 'info');
      return response;
    });

    // Test 3: Create Leave Request
    let leaveRequestId;
    await this.test('Create Leave Request', async () => {
      const leaveRequest = {
        type: 'LEAVE',
        requestData: {
          leaveType: 'ANNUAL',
          startDate: '2025-12-20',
          endDate: '2025-12-22',
          daysRequested: 3,
          reason: 'API Testing - Christmas Holiday',
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 5,
            remainingDays: 20
          }
        },
        notes: 'Created via API test script'
      };

      const response = await this.makeRequest('POST', '/api/requests/leave', leaveRequest);
      leaveRequestId = response.id;
      this.log(`Created leave request: ${leaveRequestId}`, 'info');
      return response;
    });

    // Test 4: Create Remote Work Request
    let remoteWorkId;
    await this.test('Create Remote Work Request', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      
      const remoteWorkRequest = {
        type: 'REMOTE_WORK',
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'API Testing - Better focus at home office',
          remoteLocation: 'Home Office - API Test',
          notes: 'Testing remote work request creation'
        }
      };

      const response = await this.makeRequest('POST', '/api/requests/remote-work', remoteWorkRequest);
      remoteWorkId = response.id;
      this.log(`Created remote work request: ${remoteWorkId}`, 'info');
      return response;
    });

    // Test 5: Create Attendance Correction
    let attendanceId;
    await this.test('Create Attendance Correction Request', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const correctionRequest = {
        type: 'ATTENDANCE_CORRECTION',
        requestData: {
          requestedDate: yesterday.toISOString().split('T')[0],
          reason: 'API Testing - Forgot to clock in due to early meeting'
        },
        notes: 'Testing attendance correction via API'
      };

      const response = await this.makeRequest('POST', '/api/requests/attendance-correction', correctionRequest);
      attendanceId = response.id;
      this.log(`Created attendance correction: ${attendanceId}`, 'info');
      return response;
    });

    // Test 6: Get specific request
    if (leaveRequestId) {
      await this.test('Get Specific Request by ID', async () => {
        const response = await this.makeRequest('GET', `/api/requests/${leaveRequestId}`);
        this.log(`Retrieved request: ${response.id} - Status: ${response.status}`, 'info');
        return response;
      });
    }

    // Test 7: Get requests by type
    await this.test('Get Requests by Type (LEAVE)', async () => {
      const response = await this.makeRequest('GET', '/api/requests?type=LEAVE');
      this.log(`Found ${response.length} leave requests`, 'info');
      return response;
    });

    // Test 8: Get request statistics
    await this.test('Get Request Statistics', async () => {
      const response = await this.makeRequest('GET', '/api/requests/stats/summary');
      this.log(`Statistics - Total: ${response.total}, Approved: ${response.approved}, Pending: ${response.pending}`, 'info');
      return response;
    });

    // Test 9: Validate request
    await this.test('Validate Request Creation', async () => {
      const validRequest = {
        type: 'LEAVE',
        requestData: {
          leaveType: 'ANNUAL',
          startDate: '2025-11-15',
          endDate: '2025-11-17',
          daysRequested: 3,
          reason: 'Validation test',
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 5,
            remainingDays: 20
          }
        }
      };

      const response = await this.makeRequest('POST', '/api/requests/validate', validRequest);
      this.log(`Validation result: ${response.canCreate ? 'Valid' : 'Invalid'}`, 'info');
      return response;
    });

    // Test 10: Test manager endpoints (using same token)
    await this.test('Get Pending Requests (Manager View)', async () => {
      const response = await this.makeRequest('GET', '/api/requests/pending/approval');
      this.log(`Pending requests for approval: ${response.length}`, 'info');
      return response;
    });

    // Print results
    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 QUICK API TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Your unified request system is working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
    }
    console.log('='.repeat(60));
  }
}

// Run the tests
async function main() {
  const tester = new QuickAPITest();
  await tester.runQuickTests();
}

main().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});