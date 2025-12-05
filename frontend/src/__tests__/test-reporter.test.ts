import { describe, test, expect } from 'vitest';
import { TestReporter, extractTaskId, extractComparisonFromError, TestResult } from '../../e2e/utils/test-reporter';

describe('TestReporter', () => {
  test('Task 5.1 - reporter outputs task ID with each result', () => {
    const reporter = new TestReporter();
    
    // Add a test result
    const result: TestResult = {
      taskId: '3.1',
      testName: 'Dashboard displays connection status',
      status: 'passed',
      screenshots: [],
      duration: 150,
    };
    
    reporter.addResult(result);
    
    const report = reporter.generateReport();
    expect(report.results).toHaveLength(1);
    expect(report.results[0].taskId).toBe('3.1');
  });

  test('Task 5.1 - failures include paths to expected, actual, diff images', () => {
    const reporter = new TestReporter();
    
    // Add a failed test result with comparison details
    const result: TestResult = {
      taskId: '4.2',
      testName: 'Settings form validation',
      status: 'failed',
      screenshots: [],
      duration: 200,
      error: 'Screenshot comparison failed',
      expectedPath: '/e2e/screenshots/baselines/task-4.2-1.png',
      actualPath: '/e2e/screenshots/actuals/task-4.2-1.png',
      diffPath: '/e2e/screenshots/diffs/task-4.2-1-diff.png',
      diffPercentage: 2.5,
    };
    
    reporter.addResult(result);
    
    const report = reporter.generateReport();
    expect(report.results[0].expectedPath).toBe('/e2e/screenshots/baselines/task-4.2-1.png');
    expect(report.results[0].actualPath).toBe('/e2e/screenshots/actuals/task-4.2-1.png');
    expect(report.results[0].diffPath).toBe('/e2e/screenshots/diffs/task-4.2-1-diff.png');
    expect(report.results[0].diffPercentage).toBe(2.5);
  });

  test('Task 5.1 - summary shows pass/fail counts per task', () => {
    const reporter = new TestReporter();
    
    // Add multiple results for different tasks
    reporter.addResult({
      taskId: '3.1',
      testName: 'Test 1',
      status: 'passed',
      screenshots: [],
      duration: 100,
    });
    
    reporter.addResult({
      taskId: '3.1',
      testName: 'Test 2',
      status: 'failed',
      screenshots: [],
      duration: 150,
      error: 'Test failed',
    });
    
    reporter.addResult({
      taskId: '4.1',
      testName: 'Test 3',
      status: 'passed',
      screenshots: [],
      duration: 120,
    });
    
    reporter.addResult({
      taskId: '4.1',
      testName: 'Test 4',
      status: 'new-baseline',
      screenshots: [],
      duration: 180,
    });
    
    const report = reporter.generateReport();
    
    // Check task summaries
    expect(report.taskSummaries).toHaveLength(2);
    
    const task31 = report.taskSummaries.find(t => t.taskId === '3.1');
    expect(task31).toBeDefined();
    expect(task31!.passed).toBe(1);
    expect(task31!.failed).toBe(1);
    expect(task31!.total).toBe(2);
    
    const task41 = report.taskSummaries.find(t => t.taskId === '4.1');
    expect(task41).toBeDefined();
    expect(task41!.passed).toBe(1);
    expect(task41!.newBaselines).toBe(1);
    expect(task41!.total).toBe(2);
    
    // Check totals
    expect(report.totalPassed).toBe(2);
    expect(report.totalFailed).toBe(1);
    expect(report.totalNewBaselines).toBe(1);
    expect(report.totalTests).toBe(4);
  });
});

describe('extractTaskId', () => {
  test('extracts task ID from "Task X.Y" format', () => {
    expect(extractTaskId('Task 3.1 - Dashboard test')).toBe('3.1');
    expect(extractTaskId('Task 4.2: Settings validation')).toBe('4.2');
  });

  test('extracts task ID from "task-X.Y" format', () => {
    expect(extractTaskId('task-3.1 Dashboard test')).toBe('3.1');
    expect(extractTaskId('Some test task-4.2')).toBe('4.2');
  });

  test('extracts task ID from "[X.Y]" format', () => {
    expect(extractTaskId('[3.1] Dashboard test')).toBe('3.1');
    expect(extractTaskId('Test [4.2] validation')).toBe('4.2');
  });

  test('extracts task ID from "X.Y -" format', () => {
    expect(extractTaskId('3.1 - Dashboard test')).toBe('3.1');
    expect(extractTaskId('4.2: Settings validation')).toBe('4.2');
  });

  test('returns "unknown" when no task ID found', () => {
    expect(extractTaskId('Some random test')).toBe('unknown');
    expect(extractTaskId('Dashboard test')).toBe('unknown');
  });

  test('extracts task ID from annotations', () => {
    const annotations = [{ type: 'taskId', description: '5.1' }];
    expect(extractTaskId('Some test', annotations)).toBe('5.1');
  });

  test('prefers annotation over title', () => {
    const annotations = [{ type: 'taskId', description: '5.1' }];
    expect(extractTaskId('Task 3.1 - Some test', annotations)).toBe('5.1');
  });
});

describe('extractComparisonFromError', () => {
  test('extracts diff percentage from error message', () => {
    const result = extractComparisonFromError({ message: 'Screenshot diff: 2.5%' });
    expect(result.diffPercentage).toBe(2.5);
  });

  test('extracts paths from error message', () => {
    const result = extractComparisonFromError({
      message: 'Comparison failed. Expected: /path/to/expected.png Actual: /path/to/actual.png Diff: /path/to/diff.png',
    });
    expect(result.expectedPath).toBe('/path/to/expected.png');
    expect(result.actualPath).toBe('/path/to/actual.png');
    expect(result.diffPath).toBe('/path/to/diff.png');
  });

  test('returns empty object for undefined error', () => {
    const result = extractComparisonFromError(undefined);
    expect(result).toEqual({});
  });

  test('returns empty object for error without message', () => {
    const result = extractComparisonFromError({});
    expect(result).toEqual({});
  });
});
