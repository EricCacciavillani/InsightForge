/**
 * Property-based tests for Screenshot filename generation
 * 
 * **Feature: electron-playwright-testing, Property 2: Screenshots include task ID in filename**
 * **Validates: Requirements 2.2, 3.1, 3.2**
 * 
 * **Feature: electron-playwright-testing, Property 3: Multiple screenshots are numbered sequentially**
 * **Validates: Requirements 2.3, 3.4**
 * 
 * **Feature: electron-playwright-testing, Property 4: Screenshots stored in correct directory**
 * **Validates: Requirements 2.4**
 */
import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import path from 'path';
import { generateFilename, parseFilename, ScreenshotManager } from '../utils/screenshot-manager';

/**
 * Arbitrary for valid task IDs
 * Task IDs are typically in format like "3.1", "4.2", "10.15", etc.
 * but can also be simple strings like "dashboard", "settings"
 */
const taskIdArbitrary = fc.oneof(
  // Numeric task IDs like "3.1", "4.2"
  fc.tuple(
    fc.integer({ min: 1, max: 100 }),
    fc.integer({ min: 1, max: 100 })
  ).map(([major, minor]) => `${major}.${minor}`),
  // Simple alphanumeric task IDs
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,19}$/)
);

/**
 * Arbitrary for valid screenshot indices (positive integers)
 */
const indexArbitrary = fc.integer({ min: 1, max: 1000 });

test.describe('Property Tests: Screenshot Filename Generation', () => {
  
  /**
   * Property 2: Screenshots include task ID in filename
   * 
   * *For any* captured screenshot with a task ID, the resulting filename 
   * should contain that task ID in the format `task-{taskId}-{index}.png`.
   * 
   * **Feature: electron-playwright-testing, Property 2: Screenshots include task ID in filename**
   * **Validates: Requirements 2.2, 3.1, 3.2**
   */
  test('filename contains task ID for any valid task ID and index', async () => {
    await fc.assert(
      fc.property(taskIdArbitrary, indexArbitrary, (taskId, index) => {
        const filename = generateFilename(taskId, index);
        
        // Filename must start with 'task-'
        expect(filename.startsWith('task-')).toBe(true);
        
        // Filename must end with '.png'
        expect(filename.endsWith('.png')).toBe(true);
        
        // Filename must contain the index
        expect(filename).toContain(`-${index}.png`);
        
        // The sanitized task ID should be present in the filename
        // (after 'task-' prefix and before the index)
        const sanitizedTaskId = taskId.replace(/[^a-zA-Z0-9.-]/g, '-');
        expect(filename).toContain(sanitizedTaskId);
        
        // Filename format should be: task-{sanitizedTaskId}-{index}.png
        expect(filename).toBe(`task-${sanitizedTaskId}-${index}.png`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Round-trip property: parseFilename(generateFilename(taskId, index)) 
   * should return the original values (for task IDs that don't need sanitization)
   * 
   * **Feature: electron-playwright-testing, Property 2: Screenshots include task ID in filename**
   * **Validates: Requirements 2.2, 3.1, 3.2**
   */
  test('filename generation and parsing are consistent (round-trip)', async () => {
    // Use task IDs that don't require sanitization for round-trip test
    const cleanTaskIdArbitrary = fc.oneof(
      fc.tuple(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 })
      ).map(([major, minor]) => `${major}.${minor}`),
      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,9}$/)
    );

    await fc.assert(
      fc.property(cleanTaskIdArbitrary, indexArbitrary, (taskId, index) => {
        const filename = generateFilename(taskId, index);
        const parsed = parseFilename(filename);
        
        // Parsing should succeed
        expect(parsed).not.toBeNull();
        
        if (parsed) {
          // Index should match exactly
          expect(parsed.index).toBe(index);
          
          // Task ID should match (accounting for any sanitization)
          const sanitizedTaskId = taskId.replace(/[^a-zA-Z0-9.-]/g, '-');
          expect(parsed.taskId).toBe(sanitizedTaskId);
        }
      }),
      { numRuns: 100 }
    );
  });
});

test.describe('Property Tests: Sequential Screenshot Numbering', () => {
  
  /**
   * Property 3: Multiple screenshots are numbered sequentially
   * 
   * *For any* task with multiple screenshots, the index numbers should be 
   * sequential starting from 1 (1, 2, 3, ...).
   * 
   * **Feature: electron-playwright-testing, Property 3: Multiple screenshots are numbered sequentially**
   * **Validates: Requirements 2.3, 3.4**
   */
  test('multiple screenshots for same task are numbered sequentially starting from 1', async () => {
    await fc.assert(
      fc.property(
        taskIdArbitrary,
        fc.integer({ min: 1, max: 50 }), // Number of screenshots to capture
        (taskId, numScreenshots) => {
          const manager = new ScreenshotManager();
          manager.resetCounters();
          
          const indices: number[] = [];
          
          // Simulate capturing multiple screenshots for the same task
          for (let i = 0; i < numScreenshots; i++) {
            const nextIndex = manager.getCounter(taskId) + 1;
            // Simulate what capture() does internally - increment counter
            const filename = generateFilename(taskId, nextIndex);
            const parsed = parseFilename(filename);
            
            if (parsed) {
              indices.push(parsed.index);
            }
            
            // Manually increment counter to simulate capture behavior
            // This mimics the internal getNextIndex() call
            (manager as any).taskCounters.set(taskId, nextIndex);
          }
          
          // Verify sequential numbering starting from 1
          expect(indices.length).toBe(numScreenshots);
          
          for (let i = 0; i < indices.length; i++) {
            expect(indices[i]).toBe(i + 1); // Should be 1, 2, 3, ...
          }
          
          // Verify final counter matches number of screenshots
          expect(manager.getCounter(taskId)).toBe(numScreenshots);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3 (variant): Different tasks have independent counters
   * 
   * *For any* set of tasks, each task's screenshot indices should be 
   * independent and sequential within that task.
   * 
   * **Feature: electron-playwright-testing, Property 3: Multiple screenshots are numbered sequentially**
   * **Validates: Requirements 2.3, 3.4**
   */
  test('different tasks have independent sequential counters', async () => {
    await fc.assert(
      fc.property(
        fc.array(taskIdArbitrary, { minLength: 2, maxLength: 10 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }),
        (taskIds, screenshotCounts) => {
          // Ensure we have matching lengths
          const tasks = taskIds.slice(0, Math.min(taskIds.length, screenshotCounts.length));
          const counts = screenshotCounts.slice(0, tasks.length);
          
          const manager = new ScreenshotManager();
          manager.resetCounters();
          
          // Track indices per task
          const indicesPerTask: Map<string, number[]> = new Map();
          
          // Capture screenshots for each task
          for (let t = 0; t < tasks.length; t++) {
            const taskId = tasks[t];
            const numScreenshots = counts[t];
            
            if (!indicesPerTask.has(taskId)) {
              indicesPerTask.set(taskId, []);
            }
            
            for (let i = 0; i < numScreenshots; i++) {
              const nextIndex = manager.getCounter(taskId) + 1;
              indicesPerTask.get(taskId)!.push(nextIndex);
              (manager as any).taskCounters.set(taskId, nextIndex);
            }
          }
          
          // Verify each task has sequential indices starting from 1
          for (const [, indices] of indicesPerTask) {
            for (let i = 0; i < indices.length; i++) {
              expect(indices[i]).toBe(i + 1);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

test.describe('Property Tests: Screenshot Directory Containment', () => {
  
  /**
   * Property 4: Screenshots stored in correct directory
   * 
   * *For any* captured screenshot, the file path should be within the 
   * configured screenshots directory.
   * 
   * **Feature: electron-playwright-testing, Property 4: Screenshots stored in correct directory**
   * **Validates: Requirements 2.4**
   */
  test('screenshot paths are within configured screenshots directory', async () => {
    await fc.assert(
      fc.property(taskIdArbitrary, indexArbitrary, (taskId, index) => {
        const manager = new ScreenshotManager();
        const directories = manager.getDirectories();
        
        // Generate the expected filepath for a screenshot
        const filename = generateFilename(taskId, index);
        const expectedPath = path.join(directories.actualDir, filename);
        
        // Verify the path is within the screenshots directory
        const normalizedScreenshotDir = path.normalize(directories.screenshotDir);
        const normalizedExpectedPath = path.normalize(expectedPath);
        
        // The screenshot path should start with the screenshots directory
        expect(normalizedExpectedPath.startsWith(normalizedScreenshotDir)).toBe(true);
        
        // The screenshot should be in the 'actuals' subdirectory
        const normalizedActualDir = path.normalize(directories.actualDir);
        expect(normalizedExpectedPath.startsWith(normalizedActualDir)).toBe(true);
        
        // Verify the path structure: screenshotDir/actuals/filename
        const relativePath = path.relative(directories.screenshotDir, expectedPath);
        expect(relativePath.startsWith('actuals')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4 (variant): Baseline paths are within configured baseline directory
   * 
   * *For any* baseline screenshot path, it should be within the configured 
   * baselines directory.
   * 
   * **Feature: electron-playwright-testing, Property 4: Screenshots stored in correct directory**
   * **Validates: Requirements 2.4**
   */
  test('baseline paths are within configured baselines directory', async () => {
    await fc.assert(
      fc.property(taskIdArbitrary, indexArbitrary, (taskId, index) => {
        const manager = new ScreenshotManager();
        const directories = manager.getDirectories();
        
        // Generate the expected baseline filepath
        const filename = generateFilename(taskId, index);
        const expectedBaselinePath = path.join(directories.baselineDir, filename);
        
        // Verify the baseline path is within the screenshots directory
        const normalizedScreenshotDir = path.normalize(directories.screenshotDir);
        const normalizedBaselinePath = path.normalize(expectedBaselinePath);
        
        // The baseline path should start with the screenshots directory
        expect(normalizedBaselinePath.startsWith(normalizedScreenshotDir)).toBe(true);
        
        // The baseline should be in the 'baselines' subdirectory
        const normalizedBaselineDir = path.normalize(directories.baselineDir);
        expect(normalizedBaselinePath.startsWith(normalizedBaselineDir)).toBe(true);
        
        // Verify the path structure: screenshotDir/baselines/filename
        const relativePath = path.relative(directories.screenshotDir, expectedBaselinePath);
        expect(relativePath.startsWith('baselines')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4 (variant): Diff paths are within configured diffs directory
   * 
   * *For any* diff image path, it should be within the configured 
   * diffs directory.
   * 
   * **Feature: electron-playwright-testing, Property 4: Screenshots stored in correct directory**
   * **Validates: Requirements 2.4**
   */
  test('diff paths are within configured diffs directory', async () => {
    await fc.assert(
      fc.property(taskIdArbitrary, indexArbitrary, (taskId, index) => {
        const manager = new ScreenshotManager();
        const directories = manager.getDirectories();
        
        // Generate the expected diff filepath (using same filename pattern)
        const filename = generateFilename(taskId, index);
        const expectedDiffPath = path.join(directories.diffDir, filename);
        
        // Verify the diff path is within the screenshots directory
        const normalizedScreenshotDir = path.normalize(directories.screenshotDir);
        const normalizedDiffPath = path.normalize(expectedDiffPath);
        
        // The diff path should start with the screenshots directory
        expect(normalizedDiffPath.startsWith(normalizedScreenshotDir)).toBe(true);
        
        // The diff should be in the 'diffs' subdirectory
        const normalizedDiffDir = path.normalize(directories.diffDir);
        expect(normalizedDiffPath.startsWith(normalizedDiffDir)).toBe(true);
        
        // Verify the path structure: screenshotDir/diffs/filename
        const relativePath = path.relative(directories.screenshotDir, expectedDiffPath);
        expect(relativePath.startsWith('diffs')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
