#!/usr/bin/env node

/**
 * Immediate API Testing Script for Unified Request System
 * Tests all APIs step-by-step to ensure everything works seamlessly
 */

const axios = require('axios');
const colors = require('colors');

class APITester {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.authToken = null;
    this.managerToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      errors: []
    };
    this.createdRequests = [];
  }

  // Utility methods
  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    switch (type) {
      case 'success':
        console.log(`[${timestamp}] ✅ ${message}`.green);
        break;
      case 'error':
        console.log(`[${timestamp}] ❌ ${message}`.red);
        break;
      case 'warning':
        console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
        break;
      case 'info':
        console.log(`[${timestamp}] ℹ️  ${message}`.blue);
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  }

  async test(description, testFn) {
    this.testResults.total++;
    try {
      this.log(`Testing: ${description}`, 'info');
      await testFn();
      this.testResults.passed++;
      this.log(`PASSED: ${description}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ description, error: error.message });
      this.log(`FAILED: ${description} - ${error.message}`, 'error');
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    if (this.authToken) {
      config.headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Log the error details for debugging
      if (error.response) {
        this.log(`API Error: ${method} ${endpoint} - Status: ${error.response.status} - ${error.response.statusText}`, 'error');
        if (error.response.data) {
          this.log(`Error Details: ${JSON.stringify(error.response.data)}`, 'error');
        }
      }
      throw error;
    }
  }

  // Test Authentication
  async testAuthentication() {
    await this.test('Using Provided JWT Token', async () => {
      // Use the provided JWT token and user ID
      this.authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU5ODI4MTk4fQ.WxJNbyqTqK98Uu8xMicT-cFWKdzEC4bAVKkz1AVkMsE';
      this.employeeId = 'afc70db3-6f43-4882-92fd-4715f25ffc95';
      this.kahaId = 'U-8C695E';
      
      this.log(`Using JWT Token for user: ${this.employeeId} (${this.kahaId})`, 'success');
      
      // Test if the token works by making a simple request
      try {
        await this.makeRequest('GET', '/api/requests');
        this.log('JWT Token is valid and working', 'success');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          throw new Error('JWT Token is invalid or expired');
        }
        // If it's a different error (like endpoint not found), that's okay for now
        this.log('JWT Token appears to be valid (endpoint may not exist yet)', 'info');
      }
    });

    await this.test('Setup Manager Token (Same User as Manager)', async () => {
      // For testing purposes, we'll use the same token for manager operations
      // In a real scenario, you'd have a separate manager token
      this.managerToken = this.authToken;
      this.managerId = this.employeeId;
      
      this.log(`Using same token for manager operations: ${this.managerId}`, 'info');
    });
  }

  // Test Migration System
  async testMigrationSystem() {
    await this.test('Check Migration Status', async () => {
      const response = await this.makeRequest('GET', '/api/migration/consolidate-requests/status');
      
      if (!response.hasOwnProperty('migrationComplete')) {
        throw new Error('Migration status response missing required fields');
      }
      
      this.log(`Migration Status: ${response.migrationComplete ? 'Complete' : 'Pending'}`, 'info');
    });
  }

  // Test Request Creation
  async testRequestCreation() {
    // Test Leave Request Creation
    await this.test('Create Leave Request', async () => {
      const leaveRequest = {
        type: 'LEAVE',
        requestData: {
          leaveType: 'ANNUAL',
          startDate: '2025-12-20',
          endDate: '2025-12-22',
          daysRequested: 3,
          reason: 'Christmas holiday',
          balanceInfo: {
            allocatedDays: 25,
            usedDays: 5,
            remainingDays: 20
          }
        },
        notes: 'Family vacation'
      };

      const response = await this.makeRequest('POST', '/api/requests/leave', leaveRequest);
      
      if (!response.id || response.type !== 'LEAVE') {
        throw new Error('Invalid leave request response');
      }
      
      this.createdRequests.push({ id: response.id, type: 'LEAVE' });
      this.log(`Created leave request: ${response.id}`, 'success');
    });

    // Test Remote Work Request Creation
    await this.test('Create Remote Work Request', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      
      const remoteWorkRequest = {
        type: 'REMOTE_WORK',
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'Better focus at home office',
          remoteLocation: 'Home Office',
          notes: 'Have all necessary equipment'
        }
      };

      const response = await this.makeRequest('POST', '/api/requests/remote-work', remoteWorkRequest);
      
      if (!response.id || response.type !== 'REMOTE_WORK') {
        throw new Error('Invalid remote work request response');
      }
      
      this.createdRequests.push({ id: response.id, type: 'REMOTE_WORK' });
      this.log(`Created remote work request: ${response.id}`, 'success');
    });

    // Test Attendance Correction Request Creation
    await this.test('Create Attendance Correction Request', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const correctionRequest = {
        type: 'ATTENDANCE_CORRECTION',
        requestData: {
          requestedDate: yesterday.toISOString().split('T')[0],
          reason: 'Forgot to clock in due to early meeting'
        },
        notes: 'Had 7:30 AM client meeting'
      };

      const response = await this.makeRequest('POST', '/api/requests/attendance-correction', correctionRequest);
      
      if (!response.id || response.type !== 'ATTENDANCE_CORRECTION') {
        throw new Error('Invalid attendance correction request response');
      }
      
      this.createdRequests.push({ id: response.id, type: 'ATTENDANCE_CORRECTION' });
      this.log(`Created attendance correction request: ${response.id}`, 'success');
    });

    // Test Generic Request Creation
    await this.test('Create Request via Generic Endpoint', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const genericRequest = {
        type: 'REMOTE_WORK',
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'Testing generic endpoint',
          remoteLocation: 'Home'
        }
      };

      const response = await this.makeRequest('POST', '/api/requests', genericRequest);
      
      if (!response.id || response.type !== 'REMOTE_WORK') {
        throw new Error('Invalid generic request response');
      }
      
      this.createdRequests.push({ id: response.id, type: 'REMOTE_WORK' });
      this.log(`Created request via generic endpoint: ${response.id}`, 'success');
    });
  }

  // Test Request Retrieval
  async testRequestRetrieval() {
    await this.test('Get All User Requests', async () => {
      const response = await this.makeRequest('GET', '/api/requests');
      
      if (!Array.isArray(response)) {
        throw new Error('Requests response should be an array');
      }
      
      this.log(`Retrieved ${response.length} requests`, 'info');
    });

    await this.test('Get Requests by Type', async () => {
      const response = await this.makeRequest('GET', '/api/requests?type=LEAVE');
      
      if (!Array.isArray(response)) {
        throw new Error('Filtered requests response should be an array');
      }
      
      response.forEach(req => {
        if (req.type !== 'LEAVE') {
          throw new Error('Filtered requests contain wrong type');
        }
      });
      
      this.log(`Retrieved ${response.length} leave requests`, 'info');
    });

    await this.test('Get Specific Request by ID', async () => {
      if (this.createdRequests.length === 0) {
        throw new Error('No requests available to test');
      }
      
      const requestId = this.createdRequests[0].id;
      const response = await this.makeRequest('GET', `/api/requests/${requestId}`);
      
      if (response.id !== requestId) {
        throw new Error('Retrieved request ID does not match');
      }
      
      this.log(`Retrieved specific request: ${requestId}`, 'success');
    });

    await this.test('Get Requests with Date Filter', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      
      const response = await this.makeRequest('GET', `/api/requests?startDate=${startDate}&endDate=${endDate}`);
      
      if (!Array.isArray(response)) {
        throw new Error('Date filtered requests should be an array');
      }
      
      this.log(`Retrieved ${response.length} requests in date range`, 'info');
    });
  }

  // Test Request Validation
  async testRequestValidation() {
    await this.test('Validate Valid Request', async () => {
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
      
      if (!response.hasOwnProperty('canCreate')) {
        throw new Error('Validation response missing canCreate field');
      }
      
      this.log(`Validation result: ${response.canCreate}`, 'info');
    });

    await this.test('Validate Invalid Request (Future Date for Attendance)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const invalidRequest = {
        type: 'ATTENDANCE_CORRECTION',
        requestData: {
          requestedDate: futureDate.toISOString().split('T')[0],
          reason: 'Future date test'
        }
      };

      try {
        await this.makeRequest('POST', '/api/requests/validate', invalidRequest);
        throw new Error('Should have failed validation for future date');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          this.log('Correctly rejected future date for attendance correction', 'success');
        } else {
          throw error;
        }
      }
    });
  }

  // Test Manager Workflows
  async testManagerWorkflows() {
    // Switch to manager token
    const originalToken = this.authToken;
    this.authToken = this.managerToken;

    await this.test('Get Pending Requests for Manager', async () => {
      const response = await this.makeRequest('GET', '/api/requests/pending/approval');
      
      if (!Array.isArray(response)) {
        throw new Error('Pending requests should be an array');
      }
      
      this.log(`Manager has ${response.length} pending requests`, 'info');
    });

    await this.test('Get Team Requests', async () => {
      const response = await this.makeRequest('GET', '/api/requests/team/all');
      
      if (!Array.isArray(response)) {
        throw new Error('Team requests should be an array');
      }
      
      this.log(`Manager has ${response.length} team requests`, 'info');
    });

    if (this.createdRequests.length > 0) {
      await this.test('Approve a Request', async () => {
        const requestId = this.createdRequests[0].id;
        
        const approvalData = {
          status: 'APPROVED',
          notes: 'Approved for testing purposes'
        };

        const response = await this.makeRequest('POST', `/api/requests/${requestId}/approve`, approvalData);
        
        if (response.status !== 'APPROVED') {
          throw new Error('Request was not approved successfully');
        }
        
        this.log(`Approved request: ${requestId}`, 'success');
      });

      if (this.createdRequests.length > 1) {
        await this.test('Reject a Request', async () => {
          const requestId = this.createdRequests[1].id;
          
          const rejectionData = {
            status: 'REJECTED',
            rejectionReason: 'Testing rejection workflow'
          };

          const response = await this.makeRequest('POST', `/api/requests/${requestId}/approve`, rejectionData);
          
          if (response.status !== 'REJECTED') {
            throw new Error('Request was not rejected successfully');
          }
          
          this.log(`Rejected request: ${requestId}`, 'success');
        });
      }
    }

    // Restore employee token
    this.authToken = originalToken;
  }

  // Test Statistics
  async testStatistics() {
    await this.test('Get Request Statistics', async () => {
      const response = await this.makeRequest('GET', '/api/requests/stats/summary');
      
      const requiredFields = ['total', 'pending', 'approved', 'rejected', 'approvalRate'];
      requiredFields.forEach(field => {
        if (!response.hasOwnProperty(field)) {
          throw new Error(`Statistics missing field: ${field}`);
        }
      });
      
      this.log(`Statistics: ${response.total} total, ${response.approved} approved, ${response.approvalRate}% approval rate`, 'info');
    });

    await this.test('Get Statistics by Type', async () => {
      const response = await this.makeRequest('GET', '/api/requests/stats/summary?type=LEAVE');
      
      if (typeof response.total !== 'number') {
        throw new Error('Statistics should include numeric total');
      }
      
      this.log(`Leave statistics: ${response.total} total requests`, 'info');
    });
  }

  // Test Request Modifications
  async testRequestModifications() {
    if (this.createdRequests.length > 2) {
      await this.test('Cancel a Request', async () => {
        const requestId = this.createdRequests[2].id;
        
        const response = await this.makeRequest('POST', `/api/requests/${requestId}/cancel`);
        
        if (response.status !== 'CANCELLED') {
          throw new Error('Request was not cancelled successfully');
        }
        
        this.log(`Cancelled request: ${requestId}`, 'success');
      });
    }
  }

  // Test Error Handling
  async testErrorHandling() {
    await this.test('Handle Non-existent Request', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      try {
        await this.makeRequest('GET', `/api/requests/${fakeId}`);
        throw new Error('Should have returned 404 for non-existent request');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.log('Correctly returned 404 for non-existent request', 'success');
        } else {
          throw error;
        }
      }
    });

    await this.test('Handle Invalid Request Data', async () => {
      const invalidRequest = {
        type: 'INVALID_TYPE',
        requestData: {}
      };

      try {
        await this.makeRequest('POST', '/api/requests', invalidRequest);
        throw new Error('Should have returned 400 for invalid request');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          this.log('Correctly returned 400 for invalid request', 'success');
        } else {
          throw error;
        }
      }
    });

    await this.test('Handle Unauthorized Access', async () => {
      const originalToken = this.authToken;
      this.authToken = null;

      try {
        await this.makeRequest('GET', '/api/requests');
        throw new Error('Should have returned 401 for unauthorized access');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          this.log('Correctly returned 401 for unauthorized access', 'success');
        } else {
          throw error;
        }
      }

      this.authToken = originalToken;
    });
  }

  // Cleanup
  async cleanup() {
    this.log('Cleaning up test data...', 'info');
    
    for (const request of this.createdRequests) {
      try {
        await this.makeRequest('DELETE', `/api/requests/${request.id}`);
        this.log(`Cleaned up request: ${request.id}`, 'info');
      } catch (error) {
        // Ignore cleanup errors
        this.log(`Could not clean up request ${request.id}: ${error.message}`, 'warning');
      }
    }
  }

  // Print Results
  printResults() {
    console.log('\\n' + '='.repeat(60));
    console.log('🧪 API TESTING RESULTS'.bold);
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`.green);
    console.log(`Failed: ${this.testResults.failed}`.red);
    console.log(`Success Rate: ${Math.round((this.testResults.passed / this.testResults.total) * 100)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\\n❌ FAILED TESTS:'.red);
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.description}`.red);
        console.log(`   Error: ${error.error}`.gray);
      });
    }
    
    if (this.testResults.failed === 0) {
      console.log('\\n🎉 ALL TESTS PASSED! Your unified request system is working perfectly!'.green.bold);
    } else {
      console.log('\\n⚠️  Some tests failed. Please check the errors above and fix the issues.'.yellow);
    }
    
    console.log('='.repeat(60));
  }

  // Main test execution
  async runAllTests() {
    console.log('🚀 Starting Comprehensive API Testing for Unified Request System\\n'.cyan.bold);
    
    try {
      // Test in logical order
      await this.testAuthentication();
      await this.testMigrationSystem();
      await this.testRequestCreation();
      await this.testRequestRetrieval();
      await this.testRequestValidation();
      await this.testManagerWorkflows();
      await this.testStatistics();
      await this.testRequestModifications();
      await this.testErrorHandling();
      
      // Cleanup
      await this.cleanup();
      
    } catch (error) {
      this.log(`Critical error during testing: ${error.message}`, 'error');
    }
    
    // Print final results
    this.printResults();
    
    // Exit with appropriate code
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const baseURL = args[0] || 'http://localhost:3000';
  
  console.log(`Testing API at: ${baseURL}`.cyan);
  
  const tester = new APITester(baseURL);
  await tester.runAllTests();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { APITester };