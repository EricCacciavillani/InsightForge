// Import types only - avoid importing from @playwright/test directly to prevent conflicts
// when this file is imported by test files
import type { ComparisonResult } from './baseline-comparator';

// Define minimal types needed for the Reporter interface
// These match Playwright's types but avoid the import conflict
interface ReporterTestCase {
  title: string;
  annotations: { type: string; description?: string }[];
}

interface ReporterTestResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  error?: { message?: string };
  attachments?: { name: string; contentType: string; path?: string }[];
}

interface ReporterFullConfig {
  // Minimal config interface
}

interface ReporterSuite {
  // Minimal suite interface
}

interface ReporterFullResult {
  status: 'passed' | 'failed' | 'timedout' | 'interrupted';
}

/**
 * Result of a screenshot comparison within a test
 */
export interface ScreenshotResult {
  /** Path to the screenshot */
  path: string;
  /** Comparison result if baseline exists */
  comparison?: ComparisonResult;
  /** Whether this screenshot is a new baseline */
  isBaseline: boolean;
}

/**
 * Result of a single visual test with task context
 */
export interface TestResult {
  /** Task identifier (e.g., "3.1", "4.2") */
  taskId: string;
  /** Descriptive test name */
  testName: string;
  /** Test status */
  status: 'passed' | 'failed' | 'new-baseline';
  /** Screenshots captured during the test */
  screenshots: ScreenshotResult[];
  /** Test duration in milliseconds */
  duration: number;
  /** Error message if test failed */
  error?: string;
  /** Path to expected/baseline image (for failures) */
  expectedPath?: string;
  /** Path to actual image (for failures) */
  actualPath?: string;
  /** Path to diff image (for failures) */
  diffPath?: string;
  /** Diff percentage (for failures) */
  diffPercentage?: number;
}

/**
 * Summary of test results grouped by task
 */
export interface TaskSummary {
  /** Task identifier */
  taskId: string;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of new baselines created */
  newBaselines: number;
  /** Total tests for this task */
  total: number;
}

/**
 * Complete test report
 */
export interface TestReport {
  /** All test results */
  results: TestResult[];
  /** Summary grouped by task */
  taskSummaries: TaskSummary[];
  /** Total passed tests */
  totalPassed: number;
  /** Total failed tests */
  totalFailed: number;
  /** Total new baselines */
  totalNewBaselines: number;
  /** Total test count */
  totalTests: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Timestamp when report was generated */
  timestamp: string;
}


/**
 * Extract task ID from test title or annotations
 * Looks for patterns like "Task 3.1", "task-3.1", or "[3.1]"
 */
function extractTaskId(testTitle: string, annotations?: { type: string; description?: string }[]): string {
  // Check annotations first
  if (annotations) {
    const taskAnnotation = annotations.find(a => a.type === 'taskId');
    if (taskAnnotation?.description) {
      return taskAnnotation.description;
    }
  }

  // Try to extract from title patterns
  const patterns = [
    /Task\s+(\d+\.\d+)/i,           // "Task 3.1"
    /task-(\d+\.\d+)/i,             // "task-3.1"
    /\[(\d+\.\d+)\]/,               // "[3.1]"
    /^(\d+\.\d+)\s*[-:]/,           // "3.1 - " or "3.1: "
  ];

  for (const pattern of patterns) {
    const match = testTitle.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return 'unknown';
}

/**
 * Extract comparison result from test attachments or error
 */
function extractComparisonFromError(error?: { message?: string }): Partial<TestResult> {
  if (!error?.message) return {};

  const result: Partial<TestResult> = {};

  // Extract diff percentage
  const diffMatch = error.message.match(/diff(?:erence)?[:\s]+(\d+(?:\.\d+)?)\s*%/i);
  if (diffMatch) {
    result.diffPercentage = parseFloat(diffMatch[1]);
  }

  // Extract paths from error message
  const expectedMatch = error.message.match(/expected[:\s]+["']?([^"'\s]+\.png)["']?/i);
  if (expectedMatch) {
    result.expectedPath = expectedMatch[1];
  }

  const actualMatch = error.message.match(/actual[:\s]+["']?([^"'\s]+\.png)["']?/i);
  if (actualMatch) {
    result.actualPath = actualMatch[1];
  }

  const diffPathMatch = error.message.match(/diff[:\s]+["']?([^"'\s]+\.png)["']?/i);
  if (diffPathMatch) {
    result.diffPath = diffPathMatch[1];
  }

  return result;
}

/**
 * TestReporter - Playwright reporter that tracks test results with task context
 * 
 * Implements the Playwright Reporter interface to capture test results,
 * associate them with task IDs, and generate summary reports.
 * 
 * Usage in playwright.config.ts:
 * ```
 * reporter: [['./e2e/utils/test-reporter.ts']]
 * ```
 */
/**
 * Reporter interface matching Playwright's Reporter type
 * Defined here to avoid import conflicts when test files import this module
 */
interface Reporter {
  onBegin?(config: ReporterFullConfig, suite: ReporterSuite): void;
  onTestEnd?(test: ReporterTestCase, result: ReporterTestResult): void;
  onEnd?(result: ReporterFullResult): Promise<void> | void;
}

class TestReporter implements Reporter {
  private results: TestResult[] = [];
  private startTime: number = 0;

  onBegin(_config: ReporterFullConfig, _suite: ReporterSuite): void {
    this.startTime = Date.now();
    this.results = [];
    console.log('\n🧪 Visual Test Reporter Started\n');
  }

  onTestEnd(test: ReporterTestCase, result: ReporterTestResult): void {
    const taskId = extractTaskId(test.title, test.annotations);
    const comparisonInfo = extractComparisonFromError(result.error);

    // Determine status
    let status: TestResult['status'] = 'passed';
    if (result.status === 'failed' || result.status === 'timedOut') {
      status = 'failed';
    } else if (result.attachments?.some(a => a.name === 'new-baseline')) {
      status = 'new-baseline';
    }

    // Build screenshots array from attachments
    const screenshots: ScreenshotResult[] = [];
    if (result.attachments) {
      for (const attachment of result.attachments) {
        if (attachment.contentType === 'image/png' && attachment.path) {
          screenshots.push({
            path: attachment.path,
            isBaseline: attachment.name === 'new-baseline',
          });
        }
      }
    }

    const testResult: TestResult = {
      taskId,
      testName: test.title,
      status,
      screenshots,
      duration: result.duration,
      error: result.error?.message,
      ...comparisonInfo,
    };

    this.results.push(testResult);

    // Print result with task context
    this.printTestResult(testResult);
  }

  /**
   * Print a single test result with task context
   */
  private printTestResult(result: TestResult): void {
    const statusIcon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '◉';
    const statusColor = result.status === 'passed' ? '\x1b[32m' : result.status === 'failed' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';

    console.log(`${statusColor}${statusIcon}${reset} [Task ${result.taskId}] ${result.testName} (${result.duration}ms)`);

    if (result.status === 'failed') {
      if (result.diffPercentage !== undefined) {
        console.log(`    Diff: ${result.diffPercentage.toFixed(2)}%`);
      }
      if (result.expectedPath) {
        console.log(`    Expected: ${result.expectedPath}`);
      }
      if (result.actualPath) {
        console.log(`    Actual: ${result.actualPath}`);
      }
      if (result.diffPath) {
        console.log(`    Diff Image: ${result.diffPath}`);
      }
      if (result.error && !result.diffPercentage) {
        // Only show error if we haven't already shown comparison details
        console.log(`    Error: ${result.error.split('\n')[0]}`);
      }
    } else if (result.status === 'new-baseline') {
      console.log(`    New baseline created`);
    }
  }


  onEnd(_result: ReporterFullResult): Promise<void> | void {
    const report = this.generateReport();
    this.printSummary(report);
  }

  /**
   * Add a test result manually (for programmatic use)
   */
  addResult(result: TestResult): void {
    this.results.push(result);
  }

  /**
   * Generate a complete test report
   */
  generateReport(): TestReport {
    const taskMap = new Map<string, TaskSummary>();

    // Group results by task
    for (const result of this.results) {
      let summary = taskMap.get(result.taskId);
      if (!summary) {
        summary = {
          taskId: result.taskId,
          passed: 0,
          failed: 0,
          newBaselines: 0,
          total: 0,
        };
        taskMap.set(result.taskId, summary);
      }

      summary.total++;
      if (result.status === 'passed') {
        summary.passed++;
      } else if (result.status === 'failed') {
        summary.failed++;
      } else if (result.status === 'new-baseline') {
        summary.newBaselines++;
      }
    }

    const taskSummaries = Array.from(taskMap.values()).sort((a, b) => 
      a.taskId.localeCompare(b.taskId, undefined, { numeric: true })
    );

    const totalPassed = this.results.filter(r => r.status === 'passed').length;
    const totalFailed = this.results.filter(r => r.status === 'failed').length;
    const totalNewBaselines = this.results.filter(r => r.status === 'new-baseline').length;
    const totalDuration = Date.now() - this.startTime;

    return {
      results: this.results,
      taskSummaries,
      totalPassed,
      totalFailed,
      totalNewBaselines,
      totalTests: this.results.length,
      totalDuration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Print a summary of all test results
   */
  printSummary(report?: TestReport): void {
    const r = report || this.generateReport();

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Visual Test Summary');
    console.log('═'.repeat(60));

    // Print task summaries
    if (r.taskSummaries.length > 0) {
      console.log('\nResults by Task:');
      for (const task of r.taskSummaries) {
        const statusIcon = task.failed > 0 ? '✗' : '✓';
        const statusColor = task.failed > 0 ? '\x1b[31m' : '\x1b[32m';
        const reset = '\x1b[0m';
        
        let details = `${task.passed} passed`;
        if (task.failed > 0) details += `, ${task.failed} failed`;
        if (task.newBaselines > 0) details += `, ${task.newBaselines} new baselines`;
        
        console.log(`  ${statusColor}${statusIcon}${reset} Task ${task.taskId}: ${details}`);
      }
    }

    // Print totals
    console.log('\n' + '─'.repeat(60));
    const passColor = r.totalPassed > 0 ? '\x1b[32m' : '';
    const failColor = r.totalFailed > 0 ? '\x1b[31m' : '';
    const newColor = r.totalNewBaselines > 0 ? '\x1b[33m' : '';
    const reset = '\x1b[0m';

    console.log(`Total: ${r.totalTests} tests`);
    console.log(`  ${passColor}✓ ${r.totalPassed} passed${reset}`);
    if (r.totalFailed > 0) {
      console.log(`  ${failColor}✗ ${r.totalFailed} failed${reset}`);
    }
    if (r.totalNewBaselines > 0) {
      console.log(`  ${newColor}◉ ${r.totalNewBaselines} new baselines${reset}`);
    }
    console.log(`Duration: ${(r.totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60) + '\n');

    // Print failure details
    if (r.totalFailed > 0) {
      console.log('\n❌ Failed Tests:\n');
      for (const result of r.results.filter(r => r.status === 'failed')) {
        console.log(`  [Task ${result.taskId}] ${result.testName}`);
        if (result.diffPercentage !== undefined) {
          console.log(`    Diff: ${result.diffPercentage.toFixed(2)}%`);
        }
        if (result.expectedPath) {
          console.log(`    Expected: ${result.expectedPath}`);
        }
        if (result.actualPath) {
          console.log(`    Actual: ${result.actualPath}`);
        }
        if (result.diffPath) {
          console.log(`    Diff Image: ${result.diffPath}`);
        }
        console.log('');
      }
    }
  }

  /**
   * Get all results (for programmatic access)
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }
}

export default TestReporter;

// Export for programmatic use
export { TestReporter, extractTaskId, extractComparisonFromError };
