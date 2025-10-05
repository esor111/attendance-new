#!/usr/bin/env node

/**
 * Attendance Microservice API Test Runner
 * Cross-platform Node.js script to test all APIs in sequence
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = './api-responses';
const LOG_FILE = path.join(OUTPUT_DIR, 'api-test.log');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Logging functions
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(`${colors.blue}${logMessage}${colors.reset}`);
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function success(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
    log(message, 'SUCCESS');
}

function error(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
    log(message, 'ERROR');
}

function warning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
    log(message, 'WARNING');
}

// HTTP request function
function makeRequest(method, endpoint, data = null, authToken = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: parsedData,
                        success: res.statusCode >= 200 && res.statusCode < 300,
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData,
                        success: res.statusCode >= 200 && res.statusCode < 300,
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// API call wrapper with logging and file saving
async function apiCall(method, endpoint, data = null, authToken = null, outputFile = null) {
    log(`Calling: ${method} ${endpoint}`);
    
    try {
        const response = await makeRequest(method, endpoint, data, authToken);
        
        if (outputFile) {
            const filePath = path.join(OUTPUT_DIR, outputFile);
            fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
        }
        
        if (response.success) {
            success(`API call successful (${response.statusCode})`);
            return response.data;
        } else {
            error(`API call failed (${response.statusCode}): ${JSON.stringify(response.data)}`);
            return null;
        }
    } catch (err) {
        error(`API call error: ${err.message}`);
        return null;
    }
}

// Extract ID from response
function extractId(responseData, idField = 'id') {
    if (responseData && typeof responseData === 'object' && responseData[idField]) {
        return responseData[idField];
    }
    return null;
}

// Main test function
async function runTests() {
    console.log(`${colors.cyan}🚀 Starting Attendance Microservice API Testing${colors.reset}`);
    console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);

    // Variables to store captured IDs
    let DEPT_ID = '';
    let MAIN_OFFICE_ID = '';
    let CLIENT_SITE_ID = '';
    let MANAGER_ID = '';
    let OFFICE_WORKER_ID = '';
    let FIELD_WORKER_ID = '';
    let ATTENDANCE_ID_1 = '';
    let SESSION_ID_1 = '';
    let LOCATION_LOG_ID_1 = '';

    console.log('\n==================================================');
    console.log('PHASE 1: FOUNDATION DATA SETUP');
    console.log('==================================================');

    // Step 1: Create Department
    log('Step 1: Creating Department');
    // Use timestamp to ensure unique department name
    const timestamp = Date.now();
    const deptResponse = await apiCall('POST', '/departments', {
        name: `Engineering Department ${timestamp}`,
        businessId: '550e8400-e29b-41d4-a716-446655440000'
    }, null, 'dept_response.json');

    if (deptResponse) {
        DEPT_ID = extractId(deptResponse);
        success(`Department created with ID: ${DEPT_ID}`);
    } else {
        error('Failed to create department');
        process.exit(1);
    }

    // Step 2: Create Main Office Entity
    log('Step 2: Creating Main Office Entity');
    const mainOfficeResponse = await apiCall('POST', '/entities', {
        name: `Main Office Kathmandu ${timestamp}`,
        kahaId: `KTM-MAIN-${timestamp}`,
        latitude: 27.7172,
        longitude: 85.3240,
        radiusMeters: 100,
        address: 'Kathmandu Plaza, Kamaladi, Kathmandu',
        description: 'Main headquarters building'
    }, null, 'main_office_response.json');

    if (mainOfficeResponse) {
        MAIN_OFFICE_ID = extractId(mainOfficeResponse);
        success(`Main Office created with ID: ${MAIN_OFFICE_ID}`);
    } else {
        error('Failed to create main office');
        process.exit(1);
    }

    // Step 3: Create Client Site Entity
    log('Step 3: Creating Client Site Entity');
    const clientSiteResponse = await apiCall('POST', '/entities', {
        name: `Client Site ABC Corp ${timestamp}`,
        kahaId: `CLIENT-ABC-${timestamp}`,
        latitude: 27.6588,
        longitude: 85.3247,
        radiusMeters: 150,
        address: 'Lalitpur Business Center, Lalitpur',
        description: 'ABC Corporation client office'
    }, null, 'client_site_response.json');

    if (clientSiteResponse) {
        CLIENT_SITE_ID = extractId(clientSiteResponse);
        success(`Client Site created with ID: ${CLIENT_SITE_ID}`);
    } else {
        error('Failed to create client site');
        process.exit(1);
    }

    // Step 4a: Create Manager User
    log('Step 4a: Creating Manager User');
    const managerResponse = await apiCall('POST', '/users', {
        name: `John Manager ${timestamp}`,
        phone: `+977981234${timestamp.toString().slice(-4)}`,
        email: `john.manager.${timestamp}@company.com`,
        address: 'Kathmandu, Nepal',
        userId: 'manager-001',
        isFieldWorker: false,
        departmentId: DEPT_ID
    }, null, 'manager_response.json');

    if (managerResponse) {
        MANAGER_ID = extractId(managerResponse);
        success(`Manager created with ID: ${MANAGER_ID}`);
    } else {
        error('Failed to create manager');
        process.exit(1);
    }

    // Step 4b: Create Office Worker User
    log('Step 4b: Creating Office Worker User');
    const officeWorkerResponse = await apiCall('POST', '/users', {
        name: `Alice Worker ${timestamp}`,
        phone: `+977981235${timestamp.toString().slice(-4)}`,
        email: `alice.worker.${timestamp}@company.com`,
        address: 'Kathmandu, Nepal',
        userId: 'worker-001',
        isFieldWorker: false,
        departmentId: DEPT_ID
    }, null, 'office_worker_response.json');

    if (officeWorkerResponse) {
        OFFICE_WORKER_ID = extractId(officeWorkerResponse);
        success(`Office Worker created with ID: ${OFFICE_WORKER_ID}`);
    } else {
        error('Failed to create office worker');
        process.exit(1);
    }

    // Step 4c: Create Field Worker User
    log('Step 4c: Creating Field Worker User');
    const fieldWorkerResponse = await apiCall('POST', '/users', {
        name: `Bob FieldWorker ${timestamp}`,
        phone: `+977981236${timestamp.toString().slice(-4)}`,
        email: `bob.field.${timestamp}@company.com`,
        address: 'Kathmandu, Nepal',
        userId: 'field-001',
        isFieldWorker: true,
        departmentId: DEPT_ID
    }, null, 'field_worker_response.json');

    if (fieldWorkerResponse) {
        FIELD_WORKER_ID = extractId(fieldWorkerResponse);
        success(`Field Worker created with ID: ${FIELD_WORKER_ID}`);
    } else {
        error('Failed to create field worker');
        process.exit(1);
    }

    console.log('\n==================================================');
    console.log('PHASE 2: CORE ATTENDANCE TESTING');
    console.log('==================================================');

    // Step 5: Office Worker Clock-In
    log('Step 5: Office Worker Clock-In');
    const clockInResponse = await apiCall('POST', '/api/attendance/clock-in', {
        latitude: 27.7175,
        longitude: 85.3245,
        notes: 'Starting work day'
    }, null, 'office_worker_clock_in.json');

    if (clockInResponse) {
        ATTENDANCE_ID_1 = extractId(clockInResponse);
        success(`Office Worker clocked in with Attendance ID: ${ATTENDANCE_ID_1}`);
    } else {
        warning('Failed office worker clock-in (might need JWT auth or server not running)');
    }

    // Step 6: Session Check-In
    log('Step 6: Session Check-In (Break)');
    const sessionResponse = await apiCall('POST', '/api/attendance/session/check-in', {
        latitude: 27.7173,
        longitude: 85.3241,
        sessionType: 'break',
        notes: 'Coffee break'
    }, null, 'session_check_in.json');

    if (sessionResponse) {
        SESSION_ID_1 = extractId(sessionResponse);
        success(`Session check-in successful with Session ID: ${SESSION_ID_1}`);
    } else {
        warning('Failed session check-in (might need JWT auth)');
    }

    // Step 7: Session Check-Out
    log('Step 7: Session Check-Out');
    const sessionCheckOutResponse = await apiCall('POST', '/api/attendance/session/check-out', {
        latitude: 27.7174,
        longitude: 85.3242,
        notes: 'Break finished'
    }, null, 'session_check_out.json');

    if (sessionCheckOutResponse) {
        success('Session check-out successful');
    } else {
        warning('Failed session check-out (might need JWT auth)');
    }

    // Step 8: Location Check-In
    log('Step 8: Field Worker Location Check-In');
    const locationResponse = await apiCall('POST', '/api/attendance/location/check-in', {
        entityId: CLIENT_SITE_ID,
        latitude: 27.6590,
        longitude: 85.3250,
        purpose: 'Client meeting',
        notes: 'Meeting with ABC Corp about project requirements'
    }, null, 'location_check_in.json');

    if (locationResponse) {
        LOCATION_LOG_ID_1 = extractId(locationResponse);
        success(`Location check-in successful with Location Log ID: ${LOCATION_LOG_ID_1}`);
    } else {
        warning('Failed location check-in (might need JWT auth)');
    }

    // Step 9: Location Check-Out
    log('Step 9: Location Check-Out');
    const locationCheckOutResponse = await apiCall('POST', '/api/attendance/location/check-out', {
        latitude: 27.6592,
        longitude: 85.3252,
        notes: 'Meeting completed successfully'
    }, null, 'location_check_out.json');

    if (locationCheckOutResponse) {
        success('Location check-out successful');
    } else {
        warning('Failed location check-out (might need JWT auth)');
    }

    console.log('\n==================================================');
    console.log('PHASE 3: QUERY TESTING');
    console.log('==================================================');

    // Step 10: Get Today's Attendance
    log('Step 10: Get Today\'s Attendance');
    const todayResponse = await apiCall('GET', '/api/attendance/today', null, null, 'today_attendance.json');
    if (todayResponse) {
        success('Retrieved today\'s attendance');
    } else {
        warning('Failed to get today\'s attendance (might need JWT auth)');
    }

    // Step 11: Find Nearby Entities
    log('Step 11: Find Nearby Entities');
    const nearbyResponse = await apiCall('GET', '/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000', null, null, 'nearby_entities.json');
    if (nearbyResponse) {
        success('Retrieved nearby entities');
    } else {
        warning('Failed to get nearby entities');
    }

    // Step 12: Clock-Out
    log('Step 12: Clock-Out');
    const clockOutResponse = await apiCall('POST', '/api/attendance/clock-out', {
        latitude: 27.7176,
        longitude: 85.3244,
        notes: 'End of work day'
    }, null, 'clock_out.json');

    if (clockOutResponse) {
        success('Clock-out successful');
    } else {
        warning('Failed clock-out (might need JWT auth)');
    }

    console.log('\n==================================================');
    console.log('ERROR TESTING');
    console.log('==================================================');

    // Step 13: Test Clock-In Outside Radius (Should Fail)
    log('Step 13: Testing Clock-In Outside Radius (Should Fail)');
    const outsideRadiusResponse = await apiCall('POST', '/api/attendance/clock-in', {
        latitude: 28.2096,
        longitude: 83.9856,
        notes: 'Trying to clock in from Pokhara (200km away)'
    }, null, 'clock_in_outside_radius.json');

    if (outsideRadiusResponse) {
        warning('Clock-in outside radius succeeded (should have failed)');
    } else {
        success('Clock-in outside radius correctly failed');
    }

    console.log('\n==================================================');
    console.log('TESTING SUMMARY');
    console.log('==================================================');

    console.log(`${colors.green}🎉 API Testing Completed!${colors.reset}`);
    console.log(`${colors.cyan}📊 Summary of Captured IDs:${colors.reset}`);
    console.log(`   Department ID: ${DEPT_ID}`);
    console.log(`   Main Office ID: ${MAIN_OFFICE_ID}`);
    console.log(`   Client Site ID: ${CLIENT_SITE_ID}`);
    console.log(`   Manager ID: ${MANAGER_ID}`);
    console.log(`   Office Worker ID: ${OFFICE_WORKER_ID}`);
    console.log(`   Field Worker ID: ${FIELD_WORKER_ID}`);

    // Create summary file
    const capturedIds = {
        departmentId: DEPT_ID,
        mainOfficeId: MAIN_OFFICE_ID,
        clientSiteId: CLIENT_SITE_ID,
        managerId: MANAGER_ID,
        officeWorkerId: OFFICE_WORKER_ID,
        fieldWorkerId: FIELD_WORKER_ID,
        attendanceId1: ATTENDANCE_ID_1,
        sessionId1: SESSION_ID_1,
        locationLogId1: LOCATION_LOG_ID_1,
        testTimestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'captured_ids.json'),
        JSON.stringify(capturedIds, null, 2)
    );

    success(`✅ Captured IDs saved to: ${path.join(OUTPUT_DIR, 'captured_ids.json')}`);
    console.log(`${colors.cyan}📁 All responses saved in: ${OUTPUT_DIR}${colors.reset}`);
    console.log(`${colors.cyan}📝 Full log available in: ${LOG_FILE}${colors.reset}`);

    console.log(`\n${colors.yellow}🔧 Next Steps:${colors.reset}`);
    console.log('1. Check responses in api-responses directory');
    console.log('2. Implement JWT authentication for protected endpoints');
    console.log('3. Run individual API tests using captured IDs');
    console.log('4. Test error scenarios and edge cases');
    console.log('\n📋 To run specific tests, use the captured IDs from captured_ids.json');
}

// Run the tests
if (require.main === module) {
    runTests().catch((err) => {
        error(`Test runner error: ${err.message}`);
        process.exit(1);
    });
}

module.exports = { runTests, apiCall, extractId };