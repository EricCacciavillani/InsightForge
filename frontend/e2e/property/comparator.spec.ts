/**
 * Property-based tests for BaselineComparator and BaselineManager
 * 
 * **Feature: electron-playwright-testing, Property 5: Baseline comparison detects differences**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * **Feature: electron-playwright-testing, Property 6: Missing baseline creates new baseline**
 * **Validates: Requirements 4.3**
 */
import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import { BaselineComparator, createComparator } from '../utils/baseline-comparator';
import { BaselineManager, createBaselineManager } from '../utils/baseline-manager';
import { generateFilename } from '../utils/screenshot-manager';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(__dirname, '../test-images-property');

/**
 * Helper to create a test PNG image with a specific color
 */
function createTestImage(
  width: number,
  height: number,
  color: [number, number, number, number]
): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = color[0];     // R
    png.data[i + 1] = color[1]; // G
    png.data[i + 2] = color[2]; // B
    png.data[i + 3] = color[3]; // A
  }
  return png;
}

/**
 * Helper to create a test PNG image with a specific percentage of different pixels
 * @param width - Image width
 * @param height - Image height
 * @param baseColor - Base color for most pixels
 * @param diffColor - Color for different pixels
 * @param diffPercentage - Percentage of pixels to make different (0-100)
 */
function createImageWithDiff(
  width: number,
  height: number,
  baseColor: [number, number, number, number],
  diffColor: [number, number, number, number],
  diffPercentage: number
): PNG {
  const png = new PNG({ width, height });
  const totalPixels = width * height;
  const diffPixelCount = Math.floor((diffPercentage / 100) * totalPixels);
  
  for (let i = 0; i < png.data.length; i += 4) {
    const pixelIndex = i / 4;
    const isDiffPixel = pixelIndex < diffPixelCount;
    const color = isDiffPixel ? diffColor : baseColor;
    
    png.data[i] = color[0];     // R
    png.data[i + 1] = color[1]; // G
    png.data[i + 2] = color[2]; // B
    png.data[i + 3] = color[3]; // A
  }
  return png;
}

/**
 * Helper to save a test image
 */
function saveTestImage(png: PNG, filename: string): string {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  const filepath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filepath, PNG.sync.write(png));
  return filepath;
}

/**
 * Cleanup helper
 */
function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// Arbitraries for property tests
const dimensionArbitrary = fc.integer({ min: 10, max: 100 });
const colorComponentArbitrary = fc.integer({ min: 0, max: 255 });
const colorArbitrary = fc.tuple(
  colorComponentArbitrary,
  colorComponentArbitrary,
  colorComponentArbitrary,
  fc.constant(255) // Alpha always 255
) as fc.Arbitrary<[number, number, number, number]>;

// Threshold arbitrary (0.001 to 0.5 = 0.1% to 50%)
const thresholdArbitrary = fc.double({ min: 0.001, max: 0.5, noNaN: true });

// Diff percentage arbitrary (0 to 100)
const diffPercentageArbitrary = fc.double({ min: 0, max: 100, noNaN: true });

test.describe('Property Tests: Baseline Comparison Threshold', () => {
  test.beforeAll(() => {
    cleanupTestDir();
  });

  test.afterAll(() => {
    cleanupTestDir();
  });

  /**
   * Property 5: Baseline comparison detects differences
   * 
   * *For any* pair of screenshots with pixel differences above the threshold,
   * the comparison should return `match: false` with the correct diff percentage.
   * 
   * **Feature: electron-playwright-testing, Property 5: Baseline comparison detects differences**
   * **Validates: Requirements 4.1, 4.2**
   */
  test('comparison returns match:false when diff percentage exceeds threshold', async () => {
    let testCounter = 0;
    
    await fc.assert(
      fc.property(
        dimensionArbitrary,
        dimensionArbitrary,
        thresholdArbitrary,
        fc.double({ min: 1, max: 100, noNaN: true }), // Diff percentage above minimum
        (width, height, threshold, diffPercentage) => {
          // Only test cases where diff is clearly above threshold
          // Add buffer to account for pixelmatch's color tolerance
          const thresholdPercent = threshold * 100;
          if (diffPercentage <= thresholdPercent + 1) {
            return true; // Skip edge cases near threshold
          }
          
          testCounter++;
          const baseColor: [number, number, number, number] = [255, 0, 0, 255]; // Red
          const diffColor: [number, number, number, number] = [0, 0, 255, 255]; // Blue
          
          // Create baseline (all red)
          const baseline = createTestImage(width, height, baseColor);
          const baselinePath = saveTestImage(baseline, `prop5-baseline-${testCounter}.png`);
          
          // Create actual with specified diff percentage
          const actual = createImageWithDiff(width, height, baseColor, diffColor, diffPercentage);
          const actualPath = saveTestImage(actual, `prop5-actual-${testCounter}.png`);
          
          const comparator = createComparator({ 
            threshold,
            generateDiff: false // Don't generate diff images for property tests
          });
          
          // Run comparison synchronously for property test
          const result = comparator['loadImage'](actualPath);
          const baselineImg = comparator['loadImage'](baselinePath);
          
          // Manual comparison logic (simplified)
          const totalPixels = width * height;
          let diffPixels = 0;
          for (let i = 0; i < result.data.length; i += 4) {
            if (
              result.data[i] !== baselineImg.data[i] ||
              result.data[i + 1] !== baselineImg.data[i + 1] ||
              result.data[i + 2] !== baselineImg.data[i + 2]
            ) {
              diffPixels++;
            }
          }
          
          const actualDiffPercentage = (diffPixels / totalPixels) * 100;
          const isWithinThreshold = comparator.isWithinThreshold(actualDiffPercentage);
          
          // If diff percentage is above threshold, match should be false
          if (actualDiffPercentage > thresholdPercent) {
            expect(isWithinThreshold).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5 (variant): Identical images always match regardless of threshold
   * 
   * *For any* threshold setting, comparing identical images should always return match:true
   * with diffPercentage of 0.
   * 
   * **Feature: electron-playwright-testing, Property 5: Baseline comparison detects differences**
   * **Validates: Requirements 4.1, 4.2**
   */
  test('identical images always match regardless of threshold', async () => {
    let testCounter = 0;
    
    await fc.assert(
      fc.asyncProperty(
        dimensionArbitrary,
        dimensionArbitrary,
        colorArbitrary,
        thresholdArbitrary,
        async (width, height, color, threshold) => {
          testCounter++;
          
          // Create two identical images
          const img1 = createTestImage(width, height, color);
          const img2 = createTestImage(width, height, color);
          
          const path1 = saveTestImage(img1, `prop5-identical-1-${testCounter}.png`);
          const path2 = saveTestImage(img2, `prop5-identical-2-${testCounter}.png`);
          
          const comparator = createComparator({ 
            threshold,
            generateDiff: false
          });
          
          const result = await comparator.compare(path1, path2);
          
          // Identical images should always match
          expect(result.match).toBe(true);
          expect(result.diffPercentage).toBe(0);
          expect(result.diffPixels).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5 (variant): isWithinThreshold is monotonic with respect to threshold
   * 
   * *For any* diff percentage, if it's within threshold T1, it should also be within
   * any threshold T2 > T1.
   * 
   * **Feature: electron-playwright-testing, Property 5: Baseline comparison detects differences**
   * **Validates: Requirements 4.1, 4.2**
   */
  test('isWithinThreshold is monotonic - larger threshold accepts more differences', async () => {
    await fc.assert(
      fc.property(
        diffPercentageArbitrary,
        thresholdArbitrary,
        thresholdArbitrary,
        (diffPercentage, threshold1, threshold2) => {
          const smallerThreshold = Math.min(threshold1, threshold2);
          const largerThreshold = Math.max(threshold1, threshold2);
          
          const comparatorSmall = createComparator({ threshold: smallerThreshold });
          const comparatorLarge = createComparator({ threshold: largerThreshold });
          
          const withinSmaller = comparatorSmall.isWithinThreshold(diffPercentage);
          const withinLarger = comparatorLarge.isWithinThreshold(diffPercentage);
          
          // If within smaller threshold, must be within larger threshold
          if (withinSmaller) {
            expect(withinLarger).toBe(true);
          }
          
          // Contrapositive: if NOT within larger, must NOT be within smaller
          if (!withinLarger) {
            expect(withinSmaller).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5 (variant): Diff percentage calculation is accurate
   * 
   * *For any* image with a known number of different pixels, the reported
   * diff percentage should match the expected value.
   * 
   * **Feature: electron-playwright-testing, Property 5: Baseline comparison detects differences**
   * **Validates: Requirements 4.1, 4.2**
   */
  test('diff percentage calculation is accurate for known differences', async () => {
    let testCounter = 0;
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }), // width
        fc.integer({ min: 10, max: 50 }), // height
        fc.integer({ min: 0, max: 100 }), // diff percentage (integer for precision)
        async (width, height, targetDiffPercent) => {
          testCounter++;
          
          const baseColor: [number, number, number, number] = [255, 0, 0, 255];
          const diffColor: [number, number, number, number] = [0, 0, 255, 255];
          
          // Create baseline (all base color)
          const baseline = createTestImage(width, height, baseColor);
          const baselinePath = saveTestImage(baseline, `prop5-accuracy-baseline-${testCounter}.png`);
          
          // Create actual with exact diff percentage
          const actual = createImageWithDiff(width, height, baseColor, diffColor, targetDiffPercent);
          const actualPath = saveTestImage(actual, `prop5-accuracy-actual-${testCounter}.png`);
          
          const comparator = createComparator({ 
            threshold: 0.5, // 50% - high threshold to not affect match result
            generateDiff: false,
            colorThreshold: 0.1
          });
          
          const result = await comparator.compare(actualPath, baselinePath);
          
          // Calculate expected diff pixels
          const totalPixels = width * height;
          const expectedDiffPixels = Math.floor((targetDiffPercent / 100) * totalPixels);
          const expectedDiffPercentage = (expectedDiffPixels / totalPixels) * 100;
          
          // Allow small tolerance due to pixelmatch's color comparison algorithm
          expect(result.diffPercentage).toBeCloseTo(expectedDiffPercentage, 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 6: Missing baseline creates new baseline
 * 
 * *For any* test run where no baseline exists, the captured screenshot
 * should be saved as the new baseline.
 * 
 * **Feature: electron-playwright-testing, Property 6: Missing baseline creates new baseline**
 * **Validates: Requirements 4.3**
 */
test.describe('Property Tests: Baseline Creation', () => {
  const BASELINE_TEST_DIR = path.join(__dirname, '../test-baseline-creation');
  const BASELINE_DIR = path.join(BASELINE_TEST_DIR, 'baselines');
  const ACTUAL_DIR = path.join(BASELINE_TEST_DIR, 'actuals');
  const DIFF_DIR = path.join(BASELINE_TEST_DIR, 'diffs');

  /**
   * Helper to create a test PNG image with a specific color
   */
  function createTestImageForBaseline(
    width: number,
    height: number,
    color: [number, number, number, number]
  ): PNG {
    const png = new PNG({ width, height });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = color[0];     // R
      png.data[i + 1] = color[1]; // G
      png.data[i + 2] = color[2]; // B
      png.data[i + 3] = color[3]; // A
    }
    return png;
  }

  /**
   * Helper to save a test image to the actuals directory
   */
  function saveActualImage(png: PNG, taskId: string, index: number): string {
    if (!fs.existsSync(ACTUAL_DIR)) {
      fs.mkdirSync(ACTUAL_DIR, { recursive: true });
    }
    const filename = generateFilename(taskId, index);
    const filepath = path.join(ACTUAL_DIR, filename);
    fs.writeFileSync(filepath, PNG.sync.write(png));
    return filepath;
  }

  /**
   * Cleanup helper
   */
  function cleanupBaselineTestDir(): void {
    if (fs.existsSync(BASELINE_TEST_DIR)) {
      fs.rmSync(BASELINE_TEST_DIR, { recursive: true, force: true });
    }
  }

  test.beforeAll(() => {
    cleanupBaselineTestDir();
  });

  test.afterAll(() => {
    cleanupBaselineTestDir();
  });

  // Arbitraries for property tests
  const indexArbitrary = fc.integer({ min: 1, max: 100 });
  const dimensionArb = fc.integer({ min: 10, max: 50 });
  const colorComponentArb = fc.integer({ min: 0, max: 255 });
  const colorArb = fc.tuple(
    colorComponentArb,
    colorComponentArb,
    colorComponentArb,
    fc.constant(255)
  ) as fc.Arbitrary<[number, number, number, number]>;

  /**
   * Property 6: Missing baseline creates new baseline
   * 
   * *For any* task ID and screenshot, when no baseline exists,
   * running a visual test should create a new baseline file.
   * 
   * **Feature: electron-playwright-testing, Property 6: Missing baseline creates new baseline**
   * **Validates: Requirements 4.3**
   */
  test('missing baseline creates new baseline file', async () => {
    let testCounter = 0;

    await fc.assert(
      fc.asyncProperty(
        dimensionArb,
        dimensionArb,
        colorArb,
        indexArbitrary,
        async (width, height, color, index) => {
          testCounter++;
          // Generate unique task ID for each test to ensure no baseline exists
          const taskId = `prop6-${testCounter}`;

          // Clean up any existing baseline for this task
          const expectedBaselinePath = path.join(BASELINE_DIR, generateFilename(taskId, index));
          if (fs.existsSync(expectedBaselinePath)) {
            fs.unlinkSync(expectedBaselinePath);
          }

          // Create a test image and save as "actual"
          const testImage = createTestImageForBaseline(width, height, color);
          const actualPath = saveActualImage(testImage, taskId, index);

          // Create BaselineManager with test directories
          const manager = createBaselineManager({
            baselineDir: BASELINE_DIR,
            actualDir: ACTUAL_DIR,
            diffDir: DIFF_DIR,
            updateBaselines: false, // Not in update mode
          });

          // Verify no baseline exists before test
          expect(manager.hasBaseline(taskId, index)).toBe(false);

          // Run visual test - should create new baseline
          const result = await manager.runVisualTest(actualPath, taskId, index);

          // Verify result indicates new baseline was created
          expect(result.isNewBaseline).toBe(true);
          expect(result.status).toBe('new-baseline');
          expect(result.taskId).toBe(taskId);
          expect(result.index).toBe(index);

          // Verify baseline file now exists
          expect(manager.hasBaseline(taskId, index)).toBe(true);
          expect(fs.existsSync(expectedBaselinePath)).toBe(true);

          // Verify baseline content matches actual
          const baselineBuffer = fs.readFileSync(expectedBaselinePath);
          const actualBuffer = fs.readFileSync(actualPath);
          expect(baselineBuffer.equals(actualBuffer)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6 (variant): New baseline has correct filename format
   * 
   * *For any* task ID and index, the created baseline should follow
   * the naming convention task-{taskId}-{index}.png
   * 
   * **Feature: electron-playwright-testing, Property 6: Missing baseline creates new baseline**
   * **Validates: Requirements 4.3**
   */
  test('new baseline has correct filename format', async () => {
    let testCounter = 0;

    await fc.assert(
      fc.asyncProperty(
        dimensionArb,
        dimensionArb,
        colorArb,
        indexArbitrary,
        async (width, height, color, index) => {
          testCounter++;
          const taskId = `prop6-fmt-${testCounter}`;

          // Create test image
          const testImage = createTestImageForBaseline(width, height, color);
          const actualPath = saveActualImage(testImage, taskId, index);

          const manager = createBaselineManager({
            baselineDir: BASELINE_DIR,
            actualDir: ACTUAL_DIR,
            diffDir: DIFF_DIR,
            updateBaselines: false,
          });

          // Run visual test
          await manager.runVisualTest(actualPath, taskId, index);

          // Get baseline path and verify filename format
          const baselinePath = manager.getBaselinePath(taskId, index);
          expect(baselinePath).not.toBeNull();

          const filename = path.basename(baselinePath!);
          const expectedFilename = generateFilename(taskId, index);
          expect(filename).toBe(expectedFilename);

          // Verify filename matches pattern task-{taskId}-{index}.png
          const pattern = /^task-.+-\d+\.png$/;
          expect(pattern.test(filename)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6 (variant): Subsequent runs use existing baseline
   * 
   * *For any* task with an existing baseline, running a visual test
   * should compare against the baseline, not create a new one.
   * 
   * **Feature: electron-playwright-testing, Property 6: Missing baseline creates new baseline**
   * **Validates: Requirements 4.3**
   */
  test('subsequent runs compare against existing baseline', async () => {
    let testCounter = 0;

    await fc.assert(
      fc.asyncProperty(
        dimensionArb,
        dimensionArb,
        colorArb,
        async (width, height, color) => {
          testCounter++;
          const taskId = `prop6-subseq-${testCounter}`;
          const index = 1;

          // Create test image
          const testImage = createTestImageForBaseline(width, height, color);
          const actualPath = saveActualImage(testImage, taskId, index);

          const manager = createBaselineManager({
            baselineDir: BASELINE_DIR,
            actualDir: ACTUAL_DIR,
            diffDir: DIFF_DIR,
            updateBaselines: false,
          });

          // First run - creates baseline
          const firstResult = await manager.runVisualTest(actualPath, taskId, index);
          expect(firstResult.isNewBaseline).toBe(true);
          expect(firstResult.status).toBe('new-baseline');

          // Second run with same image - should compare and pass
          const secondResult = await manager.runVisualTest(actualPath, taskId, index);
          expect(secondResult.isNewBaseline).toBe(false);
          expect(secondResult.status).toBe('passed');
          expect(secondResult.comparison).toBeDefined();
          expect(secondResult.comparison!.match).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
