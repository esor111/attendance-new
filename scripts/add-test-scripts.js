#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to add unified request system test commands to package.json
 */

const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read current package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Ensure scripts section exists
if (!packageJson.scripts) {
  packageJson.scripts = {};
}

// Add test scripts for unified request system
const newScripts = {
  // Main test runners
  'test:requests': 'ts-node tests/scripts/test-runner.ts',
  'test:requests:smart': 'ts-node tests/scripts/test-runner.ts smart',
  'test:requests:quick': 'ts-node tests/scripts/test-runner.ts quick',
  'test:requests:regression': 'ts-node tests/scripts/test-runner.ts regression',
  
  // Specific test suites
  'test:requests:migration': 'npm test -- --testPathPattern="unified-request-system.e2e-spec.ts" --testNamePattern="Migration System"',
  'test:requests:api': 'npm test -- --testPathPattern="unified-request-system.e2e-spec.ts"',
  'test:requests:workflows': 'npm test -- --testPathPattern="workflows/"',
  
  // Individual workflow tests
  'test:requests:leave': 'npm test -- --testPathPattern="leave-workflow.e2e-spec.ts"',
  'test:requests:remote-work': 'npm test -- --testPathPattern="remote-work-workflow.e2e-spec.ts"',
  'test:requests:attendance': 'npm test -- --testPathPattern="attendance-correction-workflow.e2e-spec.ts"',
  
  // Utility scripts
  'test:requests:debug': 'DEBUG=* npm run test:requests:smart',
  'test:requests:report': 'npm test -- --testPathPattern="tests/" --reporters=default --reporters=jest-html-reporters',
  'test:requests:coverage': 'npm test -- --testPathPattern="tests/" --coverage',
  
  // Database utilities for testing
  'db:test:setup': 'echo "Setting up test database..."',
  'db:test:reset': 'echo "Resetting test database..."',
  'db:test:migrate': 'echo "Running test database migrations..."',
  'db:test:status': 'echo "Checking test database status..."',
  
  // Test user management
  'test:users:verify': 'echo "Verifying test users..."',
  'test:users:reset': 'echo "Resetting test user passwords..."',
};

// Add new scripts, preserving existing ones
Object.assign(packageJson.scripts, newScripts);

// Write updated package.json
try {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\\n');
  console.log('✅ Successfully added unified request system test scripts to package.json');
  console.log('\\n📋 Available test commands:');
  console.log('');
  
  // Display the new commands
  Object.entries(newScripts).forEach(([script, command]) => {
    console.log(`  npm run ${script}`);
  });
  
  console.log('\\n🚀 Quick start:');
  console.log('  npm run test:requests:smart    # Intelligent test execution');
  console.log('  npm run test:requests:quick    # Fast validation');
  console.log('  npm run test:requests:workflows # Complete workflows');
  
} catch (error) {
  console.error('❌ Error writing package.json:', error.message);
  process.exit(1);
}

console.log('\\n📚 For detailed usage instructions, see: tests/README.md');