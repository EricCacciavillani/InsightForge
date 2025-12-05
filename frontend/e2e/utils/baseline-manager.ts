import fs from 'fs';
import path from 'path';
import { ScreenshotManager, ScreenshotConfig } from './screenshot-manager';
import { BaselineComparator, ComparisonResult, ComparatorConfig } from './baseline-comparator';

export interface BaselineManagerConfig extends ScreenshotConfig, ComparatorConfig {
  /** Whether to update baselines instead of comparing */
  updateBaselines?: boolean;
}

export interface VisualTestResult {
  /** Task ID for this test */
  taskId: string;
  /** Screenshot index */
  index: number;
  /** Path to the actual screenshot */
  actualPath: string;
  /** Path to the baseline screenshot (if exists) */
  baselinePath?: string;
  /** Whether this is a new baseline (no previous baseline existed) */
  isNewBaseline: boolean;
  /** Whether baselines were updated */
  baselineUpdated: boolean;
  /** Comparison result (if baseline existed and wasn't updated) */
  comparison?: ComparisonResult;
  /** Test status */
  status: 'passed' | 'failed' | 'new-baseline' | 'updated';
}

/**
 * Check if --update-baselines flag is set
 */
export function shouldUpdateBaselines(): boolean {
  return process.argv.includes('--update-baselines') || 
         process.argv.includes('--update-snapshots') ||
         process.env.UPDATE_BASELINES === 'true';
}

/**
 * BaselineManager - Handles baseline creation, comparison, and updates
 * 
 * Integrates ScreenshotManager and BaselineComparator for complete visual testing workflow.
 */
export class BaselineManager {
  private screenshotManager: ScreenshotManager;
  private comparator: BaselineComparator;
  private updateBaselines: boolean;

  constructor(config: BaselineManagerConfig = {}) {
    this.screenshotManager = new ScreenshotManager(config);
    this.comparator = new BaselineComparator(config);
    this.updateBaselines = config.updateBaselines ?? shouldUpdateBaselines();
  }


  /**
   * Run a visual test for a screenshot
   * 
   * Workflow:
   * 1. If no baseline exists, save actual as new baseline
   * 2. If --update-baselines flag is set, overwrite baseline with actual
   * 3. Otherwise, compare actual against baseline
   * 
   * @param actualPath - Path to the actual screenshot
   * @param taskId - Task identifier
   * @param index - Screenshot index (default: 1)
   * @returns VisualTestResult with test outcome
   */
  async runVisualTest(
    actualPath: string,
    taskId: string,
    index: number = 1
  ): Promise<VisualTestResult> {
    const baselinePath = this.screenshotManager.getBaseline(taskId, index);
    
    // Case 1: No baseline exists - create new baseline
    if (!baselinePath) {
      await this.screenshotManager.saveAsBaseline(actualPath);
      const newBaselinePath = this.screenshotManager.getBaseline(taskId, index);
      
      return {
        taskId,
        index,
        actualPath,
        baselinePath: newBaselinePath || undefined,
        isNewBaseline: true,
        baselineUpdated: false,
        status: 'new-baseline',
      };
    }

    // Case 2: Update baselines mode - overwrite existing baseline
    if (this.updateBaselines) {
      await this.screenshotManager.saveAsBaseline(actualPath);
      
      return {
        taskId,
        index,
        actualPath,
        baselinePath,
        isNewBaseline: false,
        baselineUpdated: true,
        status: 'updated',
      };
    }

    // Case 3: Compare against existing baseline
    const comparison = await this.comparator.compareAndSaveDiff(
      actualPath,
      baselinePath,
      taskId,
      index
    );

    return {
      taskId,
      index,
      actualPath,
      baselinePath,
      isNewBaseline: false,
      baselineUpdated: false,
      comparison,
      status: comparison.match ? 'passed' : 'failed',
    };
  }

  /**
   * Update a specific baseline with a new screenshot
   * 
   * @param actualPath - Path to the screenshot to use as new baseline
   */
  async updateBaseline(actualPath: string): Promise<void> {
    await this.screenshotManager.saveAsBaseline(actualPath);
  }

  /**
   * Check if a baseline exists for a task
   * 
   * @param taskId - Task identifier
   * @param index - Screenshot index (default: 1)
   * @returns true if baseline exists
   */
  hasBaseline(taskId: string, index: number = 1): boolean {
    return this.screenshotManager.getBaseline(taskId, index) !== null;
  }

  /**
   * Get the baseline path for a task
   * 
   * @param taskId - Task identifier
   * @param index - Screenshot index (default: 1)
   * @returns Path to baseline or null if not exists
   */
  getBaselinePath(taskId: string, index: number = 1): string | null {
    return this.screenshotManager.getBaseline(taskId, index);
  }

  /**
   * List all baselines
   * 
   * @returns Array of baseline filenames
   */
  listBaselines(): string[] {
    const dirs = this.screenshotManager.getDirectories();
    if (!fs.existsSync(dirs.baselineDir)) {
      return [];
    }
    return fs.readdirSync(dirs.baselineDir).filter(f => f.endsWith('.png'));
  }

  /**
   * Delete a baseline
   * 
   * @param taskId - Task identifier
   * @param index - Screenshot index (default: 1)
   * @returns true if baseline was deleted
   */
  deleteBaseline(taskId: string, index: number = 1): boolean {
    const baselinePath = this.screenshotManager.getBaseline(taskId, index);
    if (baselinePath && fs.existsSync(baselinePath)) {
      fs.unlinkSync(baselinePath);
      return true;
    }
    return false;
  }

  /**
   * Get the underlying ScreenshotManager
   */
  getScreenshotManager(): ScreenshotManager {
    return this.screenshotManager;
  }

  /**
   * Get the underlying BaselineComparator
   */
  getComparator(): BaselineComparator {
    return this.comparator;
  }

  /**
   * Check if update baselines mode is enabled
   */
  isUpdateMode(): boolean {
    return this.updateBaselines;
  }
}

/**
 * Create a new BaselineManager instance
 */
export function createBaselineManager(config?: BaselineManagerConfig): BaselineManager {
  return new BaselineManager(config);
}

export default BaselineManager;
