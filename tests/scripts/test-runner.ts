#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Smart Test Runner for Unified Request System
 * Provides different testing strategies and scenarios
 */

interface TestScenario {
  name: string;
  description: string;
  command: string;
  timeout?: number;
}

interface TestSuite {
  name: string;
  description: string;
  scenarios: TestScenario[];
}

class TestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'migration',
      description: 'Data Migration Tests',
      scenarios: [
        {
          name: 'migration-status',
          description: 'Check migration status and execute if needed',
          command: 'npm test -- --testNamePattern="Migration System"',
          timeout: 30000,
        },
      ],
    },
    {
      name: 'api-basic',
      description: 'Basic API Functionality Tests',
      scenarios: [
        {
          name: 'authentication',
          description: 'Test authentication and authorization',
          command: 'npm test -- --testNamePattern="Authentication Setup"',
        },
        {
          name: 'request-creation',
          description: 'Test request creation endpoints',
          command: 'npm test -- --testNamePattern="Request Creation"',
        },
        {
          name: 'request-retrieval',
          description: 'Test request retrieval and filtering',
          command: 'npm test -- --testNamePattern="Request Retrieval"',
        },
      ],
    },
    {
      name: 'api-advanced',
      description: 'Advanced API Features Tests',
      scenarios: [
        {
          name: 'validation',
          description: 'Test request validation logic',
          command: 'npm test -- --testNamePattern="Request Validation"',
        },
        {
          name: 'manager-workflows',
          description: 'Test manager approval workflows',
          command: 'npm test -- --testNamePattern="Manager Workflows"',
        },
        {
          name: 'statistics',
          description: 'Test statistics and analytics endpoints',
          command: 'npm test -- --testNamePattern="Request Statistics"',
        },
      ],
    },
    {
      name: 'edge-cases',
      description: 'Edge Cases and Error Handling',
      scenarios: [
        {
          name: 'error-handling',
          description: 'Test error scenarios and edge cases',
          command: 'npm test -- --testNamePattern="Error Handling"',
        },
        {
          name: 'performance',
          description: 'Test performance and pagination',
          command: 'npm test -- --testNamePattern="Performance and Pagination"',
        },
      ],
    },
    {
      name: 'full-workflow',
      description: 'Complete End-to-End Workflows',
      scenarios: [
        {
          name: 'leave-workflow',
          description: 'Complete leave request workflow',
          command: 'npm test -- --testPathPattern="leave-workflow.e2e-spec.ts"',
        },
        {
          name: 'remote-work-workflow',
          description: 'Complete remote work request workflow',
          command: 'npm test -- --testPathPattern="remote-work-workflow.e2e-spec.ts"',
        },
        {
          name: 'attendance-correction-workflow',
          description: 'Complete attendance correction workflow',
          command: 'npm test -- --testPathPattern="attendance-correction-workflow.e2e-spec.ts"',
        },
      ],
    },
  ];

  async runTests(suiteNames?: string[], scenarioNames?: string[]) {
    console.log('🚀 Starting Unified Request System Tests\\n');

    const suitesToRun = suiteNames 
      ? this.testSuites.filter(suite => suiteNames.includes(suite.name))
      : this.testSuites;

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const suite of suitesToRun) {
      console.log(`📋 Running Test Suite: ${suite.name}`);
      console.log(`   Description: ${suite.description}\\n`);

      const scenariosToRun = scenarioNames
        ? suite.scenarios.filter(scenario => scenarioNames.includes(scenario.name))
        : suite.scenarios;

      for (const scenario of scenariosToRun) {
        totalTests++;
        console.log(`  🧪 Running: ${scenario.name}`);
        console.log(`     ${scenario.description}`);

        try {
          const startTime = Date.now();
          
          execSync(scenario.command, {
            stdio: 'pipe',
            timeout: scenario.timeout || 60000,
            cwd: process.cwd(),
          });

          const duration = Date.now() - startTime;
          console.log(`     ✅ PASSED (${duration}ms)\\n`);
          passedTests++;
        } catch (error) {
          console.log(`     ❌ FAILED`);
          console.log(`     Error: ${error.message}\\n`);
          failedTests++;
        }
      }
    }

    this.printSummary(totalTests, passedTests, failedTests);
  }

  async runSmartTests() {
    console.log('🧠 Running Smart Test Strategy\\n');
    
    // Step 1: Check migration status first
    console.log('Step 1: Checking migration status...');
    await this.runTests(['migration']);

    // Step 2: Run basic API tests
    console.log('\\nStep 2: Testing basic API functionality...');
    await this.runTests(['api-basic']);

    // Step 3: Run advanced features if basic tests pass
    console.log('\\nStep 3: Testing advanced features...');
    await this.runTests(['api-advanced']);

    // Step 4: Test edge cases and error handling
    console.log('\\nStep 4: Testing edge cases and error handling...');
    await this.runTests(['edge-cases']);

    // Step 5: Run complete workflows
    console.log('\\nStep 5: Testing complete workflows...');
    await this.runTests(['full-workflow']);
  }

  async runQuickTests() {
    console.log('⚡ Running Quick Test Suite\\n');
    
    // Run only essential tests for quick validation
    await this.runTests(['migration'], ['migration-status']);
    await this.runTests(['api-basic'], ['authentication', 'request-creation']);
    await this.runTests(['api-advanced'], ['validation']);
  }

  async runRegressionTests() {
    console.log('🔄 Running Regression Test Suite\\n');
    
    // Run all tests to ensure no regressions
    await this.runTests();
  }

  private printSummary(total: number, passed: number, failed: number) {
    console.log('\\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
    
    if (failed === 0) {
      console.log('\\n🎉 All tests passed! The unified request system is working correctly.');
    } else {
      console.log('\\n⚠️  Some tests failed. Please review the errors above.');
    }
    console.log('='.repeat(50));
  }

  printHelp() {
    console.log('🔧 Unified Request System Test Runner\\n');
    console.log('Usage: npm run test:requests [strategy] [options]\\n');
    
    console.log('Strategies:');
    console.log('  smart      - Intelligent test execution (recommended)');
    console.log('  quick      - Fast validation of core functionality');
    console.log('  regression - Complete test suite for regression testing');
    console.log('  custom     - Run specific test suites or scenarios\\n');
    
    console.log('Available Test Suites:');
    this.testSuites.forEach(suite => {
      console.log(`  ${suite.name.padEnd(15)} - ${suite.description}`);
    });
    
    console.log('\\nExamples:');
    console.log('  npm run test:requests smart');
    console.log('  npm run test:requests quick');
    console.log('  npm run test:requests custom migration api-basic');
    console.log('  npm run test:requests custom -- --scenario validation');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const testRunner = new TestRunner();

  if (args.length === 0 || args[0] === 'help') {
    testRunner.printHelp();
    return;
  }

  const strategy = args[0];

  switch (strategy) {
    case 'smart':
      await testRunner.runSmartTests();
      break;
    
    case 'quick':
      await testRunner.runQuickTests();
      break;
    
    case 'regression':
      await testRunner.runRegressionTests();
      break;
    
    case 'custom':
      const suites = args.slice(1).filter(arg => !arg.startsWith('--'));
      const scenarioFlag = args.findIndex(arg => arg === '--scenario');
      const scenarios = scenarioFlag !== -1 ? args.slice(scenarioFlag + 1) : undefined;
      
      await testRunner.runTests(suites.length > 0 ? suites : undefined, scenarios);
      break;
    
    default:
      console.log(`❌ Unknown strategy: ${strategy}`);
      testRunner.printHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner };