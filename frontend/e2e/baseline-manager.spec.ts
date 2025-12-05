import { test, expect } from '@playwright/test';
import { BaselineManager, createBaselineManager, shouldUpdateBaselines } from './utils/baseline-manager';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(__dirname, 'test-baseline-manager');
const BASELINES_DIR = path.join(TEST_DIR, 'baselines');
const ACTUALS_DIR = path.join(TEST_DIR, 'actuals');
const DIFFS_DIR = path.join(TEST_DIR, 'diffs');

// Helper to create a test PNG image
function createTestImage(width: number, height: number, color: [number, number, number, number]): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = color[0];
    png.data[i + 1] = color[1];
    png.data[i + 2] = color[2];
    png.data[i + 3] = color[3];
  }
  return png;
}

// Helper to save a test image
function saveTestImage(png: PNG, filename: string, dir: string = ACTUALS_DIR): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, PNG.sync.write(png));
  return filepath;
}

// Cleanup helper
function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

test.describe('BaselineManager', () => {
  test.beforeAll(() => {
    cleanupTestDir();
  });

  test.afterAll(() => {
    cleanupTestDir();
  });

  test('creates new baseline when none exists', async () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
      updateBaselines: false,
    });

    const img = createTestImage(50, 50, [255, 0, 0, 255]);
    const actualPath = saveTestImage(img, 'task-6.1-1.png');

    const result = await manager.runVisualTest(actualPath, '6.1', 1);

    expect(result.isNewBaseline).toBe(true);
    expect(result.status).toBe('new-baseline');
    expect(result.baselinePath).toBeDefined();
    expect(fs.existsSync(result.baselinePath!)).toBe(true);
  });

  test('compares against existing baseline', async () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
      updateBaselines: false,
    });

    // Create baseline first
    const baselineImg = createTestImage(50, 50, [255, 0, 0, 255]);
    saveTestImage(baselineImg, 'task-6.2-1.png', BASELINES_DIR);

    // Create matching actual
    const actualImg = createTestImage(50, 50, [255, 0, 0, 255]);
    const actualPath = saveTestImage(actualImg, 'task-6.2-1.png');

    const result = await manager.runVisualTest(actualPath, '6.2', 1);

    expect(result.isNewBaseline).toBe(false);
    expect(result.status).toBe('passed');
    expect(result.comparison).toBeDefined();
    expect(result.comparison!.match).toBe(true);
  });

  test('fails when screenshots differ', async () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
      updateBaselines: false,
    });

    // Create baseline
    const baselineImg = createTestImage(50, 50, [255, 0, 0, 255]);
    saveTestImage(baselineImg, 'task-6.3-1.png', BASELINES_DIR);

    // Create different actual
    const actualImg = createTestImage(50, 50, [0, 255, 0, 255]);
    const actualPath = saveTestImage(actualImg, 'task-6.3-1.png');

    const result = await manager.runVisualTest(actualPath, '6.3', 1);

    expect(result.isNewBaseline).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.comparison).toBeDefined();
    expect(result.comparison!.match).toBe(false);
  });

  test('updates baseline when updateBaselines is true', async () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
      updateBaselines: true,
    });

    // Create old baseline
    const oldImg = createTestImage(50, 50, [255, 0, 0, 255]);
    saveTestImage(oldImg, 'task-6.4-1.png', BASELINES_DIR);

    // Create new actual
    const newImg = createTestImage(50, 50, [0, 0, 255, 255]);
    const actualPath = saveTestImage(newImg, 'task-6.4-1.png');

    const result = await manager.runVisualTest(actualPath, '6.4', 1);

    expect(result.baselineUpdated).toBe(true);
    expect(result.status).toBe('updated');
  });

  test('hasBaseline returns correct value', () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
    });

    // Create a baseline
    const img = createTestImage(10, 10, [255, 0, 0, 255]);
    saveTestImage(img, 'task-6.5-1.png', BASELINES_DIR);

    expect(manager.hasBaseline('6.5', 1)).toBe(true);
    expect(manager.hasBaseline('nonexistent', 1)).toBe(false);
  });

  test('deleteBaseline removes baseline file', () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
    });

    // Create a baseline
    const img = createTestImage(10, 10, [255, 0, 0, 255]);
    const baselinePath = saveTestImage(img, 'task-6.6-1.png', BASELINES_DIR);

    expect(fs.existsSync(baselinePath)).toBe(true);
    
    const deleted = manager.deleteBaseline('6.6', 1);
    
    expect(deleted).toBe(true);
    expect(fs.existsSync(baselinePath)).toBe(false);
  });

  test('listBaselines returns all baseline files', () => {
    const manager = createBaselineManager({
      screenshotDir: TEST_DIR,
      baselineDir: BASELINES_DIR,
      actualDir: ACTUALS_DIR,
      diffDir: DIFFS_DIR,
    });

    // Create some baselines
    const img = createTestImage(10, 10, [255, 0, 0, 255]);
    saveTestImage(img, 'task-list-1-1.png', BASELINES_DIR);
    saveTestImage(img, 'task-list-2-1.png', BASELINES_DIR);

    const baselines = manager.listBaselines();

    expect(baselines).toContain('task-list-1-1.png');
    expect(baselines).toContain('task-list-2-1.png');
  });

  test('isUpdateMode reflects configuration', () => {
    const normalManager = createBaselineManager({ updateBaselines: false });
    const updateManager = createBaselineManager({ updateBaselines: true });

    expect(normalManager.isUpdateMode()).toBe(false);
    expect(updateManager.isUpdateMode()).toBe(true);
  });
});
