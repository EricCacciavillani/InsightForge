import { Page } from 'playwright';
import path from 'path';
import fs from 'fs';

export interface ScreenshotConfig {
  /** Base directory for screenshots */
  screenshotDir?: string;
  /** Directory for baseline screenshots */
  baselineDir?: string;
  /** Directory for actual screenshots */
  actualDir?: string;
  /** Directory for diff images */
  diffDir?: string;
}

const DEFAULT_CONFIG: Required<ScreenshotConfig> = {
  screenshotDir: path.join(__dirname, '../screenshots'),
  baselineDir: path.join(__dirname, '../screenshots/baselines'),
  actualDir: path.join(__dirname, '../screenshots/actuals'),
  diffDir: path.join(__dirname, '../screenshots/diffs'),
};

/**
 * Generate a screenshot filename from task ID and index
 * Format: task-{taskId}-{index}.png
 */
export function generateFilename(taskId: string, index: number): string {
  // Sanitize taskId to be filesystem-safe (replace dots with dashes for consistency)
  const sanitizedTaskId = taskId.replace(/[^a-zA-Z0-9.-]/g, '-');
  return `task-${sanitizedTaskId}-${index}.png`;
}

/**
 * Parse a screenshot filename to extract task ID and index
 * Returns null if filename doesn't match expected format
 */
export function parseFilename(filename: string): { taskId: string; index: number } | null {
  const match = filename.match(/^task-(.+)-(\d+)\.png$/);
  if (!match) return null;
  return {
    taskId: match[1],
    index: parseInt(match[2], 10),
  };
}

/**
 * ScreenshotManager - Handles screenshot capture and file management for visual tests
 * 
 * Captures screenshots with task-mapped filenames and stores them in organized directories.
 */
export class ScreenshotManager {
  private config: Required<ScreenshotConfig>;
  private taskCounters: Map<string, number> = new Map();

  constructor(config: ScreenshotConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDirectories();
  }


  /**
   * Ensure all screenshot directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.config.screenshotDir,
      this.config.baselineDir,
      this.config.actualDir,
      this.config.diffDir,
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get the next index for a task (auto-incrementing)
   */
  private getNextIndex(taskId: string): number {
    const current = this.taskCounters.get(taskId) || 0;
    const next = current + 1;
    this.taskCounters.set(taskId, next);
    return next;
  }

  /**
   * Capture a screenshot of the current page state
   * 
   * @param page - Playwright Page object
   * @param taskId - Task identifier (e.g., "3.1", "4.2")
   * @param index - Optional explicit index, auto-increments if not provided
   * @returns Path to the saved screenshot
   */
  async capture(page: Page, taskId: string, index?: number): Promise<string> {
    const screenshotIndex = index ?? this.getNextIndex(taskId);
    const filename = generateFilename(taskId, screenshotIndex);
    const filepath = path.join(this.config.actualDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });

    return filepath;
  }

  /**
   * Get the baseline screenshot path for a task
   * 
   * @param taskId - Task identifier
   * @param index - Screenshot index (default: 1)
   * @returns Path to baseline if it exists, null otherwise
   */
  getBaseline(taskId: string, index: number = 1): string | null {
    const filename = generateFilename(taskId, index);
    const baselinePath = path.join(this.config.baselineDir, filename);
    
    if (fs.existsSync(baselinePath)) {
      return baselinePath;
    }
    return null;
  }

  /**
   * Save a screenshot as the new baseline
   * 
   * @param screenshotPath - Path to the screenshot to save as baseline
   */
  async saveAsBaseline(screenshotPath: string): Promise<void> {
    const filename = path.basename(screenshotPath);
    const baselinePath = path.join(this.config.baselineDir, filename);
    
    fs.copyFileSync(screenshotPath, baselinePath);
  }

  /**
   * List all screenshots, optionally filtered by task ID
   * 
   * @param taskId - Optional task ID to filter by
   * @returns Array of screenshot filenames
   */
  listScreenshots(taskId?: string): string[] {
    const files = fs.readdirSync(this.config.actualDir);
    const screenshots = files.filter(f => f.endsWith('.png'));
    
    if (taskId) {
      return screenshots.filter(f => {
        const parsed = parseFilename(f);
        return parsed && parsed.taskId === taskId;
      });
    }
    
    return screenshots;
  }

  /**
   * Get the configured directories
   */
  getDirectories(): Required<ScreenshotConfig> {
    return { ...this.config };
  }

  /**
   * Reset task counters (useful between test runs)
   */
  resetCounters(): void {
    this.taskCounters.clear();
  }

  /**
   * Get the current counter value for a task
   */
  getCounter(taskId: string): number {
    return this.taskCounters.get(taskId) || 0;
  }
}

/**
 * Create a new ScreenshotManager instance with default config
 */
export function createScreenshotManager(config?: ScreenshotConfig): ScreenshotManager {
  return new ScreenshotManager(config);
}

export default ScreenshotManager;
