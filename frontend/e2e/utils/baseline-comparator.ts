import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

export interface ComparisonResult {
  /** Whether the images match within threshold */
  match: boolean;
  /** Percentage of pixels that differ (0-100) */
  diffPercentage: number;
  /** Number of pixels that differ */
  diffPixels: number;
  /** Path to the diff image (if generated) */
  diffPath?: string;
  /** Path to the expected/baseline image */
  expectedPath: string;
  /** Path to the actual image */
  actualPath: string;
  /** Task ID associated with this comparison */
  taskId?: string;
  /** Diff image buffer (PNG data) */
  diffImage?: Buffer;
}

export interface ComparatorConfig {
  /** Threshold for pixel difference (0-1), default 0.001 (0.1%) */
  threshold?: number;
  /** Directory to save diff images */
  diffDir?: string;
  /** Whether to generate diff images on mismatch */
  generateDiff?: boolean;
  /** Pixelmatch threshold for color difference (0-1), default 0.1 */
  colorThreshold?: number;
}

const DEFAULT_CONFIG: Required<ComparatorConfig> = {
  threshold: 0.001, // 0.1% difference allowed
  diffDir: path.join(__dirname, '../screenshots/diffs'),
  generateDiff: true,
  colorThreshold: 0.1,
};

/**
 * BaselineComparator - Compares screenshots against baselines using pixelmatch
 * 
 * Calculates pixel differences and generates visual diff images highlighting changes.
 */
export class BaselineComparator {
  private config: Required<ComparatorConfig>;

  constructor(config: ComparatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDiffDirectory();
  }


  /**
   * Ensure the diff directory exists
   */
  private ensureDiffDirectory(): void {
    if (!fs.existsSync(this.config.diffDir)) {
      fs.mkdirSync(this.config.diffDir, { recursive: true });
    }
  }

  /**
   * Load a PNG image from file
   */
  private loadImage(imagePath: string): PNG {
    const buffer = fs.readFileSync(imagePath);
    return PNG.sync.read(buffer);
  }

  /**
   * Compare two screenshots and return the comparison result
   * 
   * @param actualPath - Path to the actual screenshot
   * @param baselinePath - Path to the baseline screenshot
   * @param taskId - Optional task ID for context
   * @returns ComparisonResult with match status and diff details
   */
  async compare(
    actualPath: string,
    baselinePath: string,
    taskId?: string
  ): Promise<ComparisonResult> {
    // Load both images
    const actual = this.loadImage(actualPath);
    const baseline = this.loadImage(baselinePath);

    // Check dimensions match
    if (actual.width !== baseline.width || actual.height !== baseline.height) {
      // Dimension mismatch - images are different
      const totalPixels = Math.max(
        actual.width * actual.height,
        baseline.width * baseline.height
      );
      return {
        match: false,
        diffPercentage: 100,
        diffPixels: totalPixels,
        expectedPath: baselinePath,
        actualPath: actualPath,
        taskId,
      };
    }

    const { width, height } = actual;
    const totalPixels = width * height;

    // Create diff image buffer
    const diff = new PNG({ width, height });

    // Run pixelmatch comparison
    const diffPixels = pixelmatch(
      actual.data,
      baseline.data,
      diff.data,
      width,
      height,
      { threshold: this.config.colorThreshold }
    );

    const diffPercentage = (diffPixels / totalPixels) * 100;
    const match = this.isWithinThreshold(diffPercentage);

    const result: ComparisonResult = {
      match,
      diffPercentage,
      diffPixels,
      expectedPath: baselinePath,
      actualPath: actualPath,
      taskId,
    };

    // Generate diff image if there are differences and config allows
    if (!match && this.config.generateDiff) {
      const diffBuffer = PNG.sync.write(diff);
      result.diffImage = diffBuffer;
    }

    return result;
  }

  /**
   * Check if a diff percentage is within the acceptable threshold
   * 
   * @param diffPercentage - Percentage of pixels that differ (0-100)
   * @returns true if within threshold, false otherwise
   */
  isWithinThreshold(diffPercentage: number): boolean {
    // Convert threshold from 0-1 to percentage (0-100)
    const thresholdPercent = this.config.threshold * 100;
    return diffPercentage <= thresholdPercent;
  }

  /**
   * Generate and save a diff image highlighting the differences
   * 
   * @param actualPath - Path to the actual screenshot
   * @param baselinePath - Path to the baseline screenshot
   * @param outputPath - Optional custom output path for the diff image
   * @returns Path to the saved diff image
   */
  async generateDiff(
    actualPath: string,
    baselinePath: string,
    outputPath?: string
  ): Promise<string> {
    const actual = this.loadImage(actualPath);
    const baseline = this.loadImage(baselinePath);

    // Handle dimension mismatch by creating a placeholder diff
    if (actual.width !== baseline.width || actual.height !== baseline.height) {
      const maxWidth = Math.max(actual.width, baseline.width);
      const maxHeight = Math.max(actual.height, baseline.height);
      const diff = new PNG({ width: maxWidth, height: maxHeight });
      
      // Fill with red to indicate complete mismatch
      for (let i = 0; i < diff.data.length; i += 4) {
        diff.data[i] = 255;     // R
        diff.data[i + 1] = 0;   // G
        diff.data[i + 2] = 0;   // B
        diff.data[i + 3] = 255; // A
      }

      const diffPath = outputPath || this.generateDiffPath(actualPath);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      return diffPath;
    }

    const { width, height } = actual;
    const diff = new PNG({ width, height });

    // Run pixelmatch with diff output
    pixelmatch(
      actual.data,
      baseline.data,
      diff.data,
      width,
      height,
      { threshold: this.config.colorThreshold }
    );

    const diffPath = outputPath || this.generateDiffPath(actualPath);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    return diffPath;
  }

  /**
   * Generate a diff file path from an actual screenshot path
   * Preserves task ID format: task-{taskId}-{index}-diff.png
   */
  private generateDiffPath(actualPath: string): string {
    const filename = path.basename(actualPath, '.png');
    return path.join(this.config.diffDir, `${filename}-diff.png`);
  }

  /**
   * Generate a diff file path with explicit task ID and index
   * Format: task-{taskId}-{index}-diff.png
   * 
   * @param taskId - Task identifier (e.g., "3.1", "4.2")
   * @param index - Screenshot index
   * @returns Path to the diff file
   */
  generateDiffPathForTask(taskId: string, index: number): string {
    const sanitizedTaskId = taskId.replace(/[^a-zA-Z0-9.-]/g, '-');
    return path.join(this.config.diffDir, `task-${sanitizedTaskId}-${index}-diff.png`);
  }

  /**
   * Compare and save diff image with task context
   * Combines compare() and generateDiff() for convenience
   * 
   * @param actualPath - Path to the actual screenshot
   * @param baselinePath - Path to the baseline screenshot
   * @param taskId - Task identifier
   * @param index - Screenshot index (default: 1)
   * @returns ComparisonResult with diffPath populated if images differ
   */
  async compareAndSaveDiff(
    actualPath: string,
    baselinePath: string,
    taskId: string,
    index: number = 1
  ): Promise<ComparisonResult> {
    const result = await this.compare(actualPath, baselinePath, taskId);
    
    if (!result.match && this.config.generateDiff) {
      const diffPath = this.generateDiffPathForTask(taskId, index);
      await this.generateDiff(actualPath, baselinePath, diffPath);
      result.diffPath = diffPath;
    }
    
    return result;
  }

  /**
   * Get the current threshold setting
   */
  getThreshold(): number {
    return this.config.threshold;
  }

  /**
   * Get the diff directory path
   */
  getDiffDir(): string {
    return this.config.diffDir;
  }
}

/**
 * Create a new BaselineComparator instance with default config
 */
export function createComparator(config?: ComparatorConfig): BaselineComparator {
  return new BaselineComparator(config);
}

export default BaselineComparator;
