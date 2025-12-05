import { test, expect } from '@playwright/test';
import { BaselineComparator, createComparator } from './utils/baseline-comparator';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(__dirname, 'test-images');

// Helper to create a test PNG image
function createTestImage(width: number, height: number, color: [number, number, number, number]): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = color[0];     // R
    png.data[i + 1] = color[1]; // G
    png.data[i + 2] = color[2]; // B
    png.data[i + 3] = color[3]; // A
  }
  return png;
}

// Helper to save a test image
function saveTestImage(png: PNG, filename: string): string {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  const filepath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filepath, PNG.sync.write(png));
  return filepath;
}

// Cleanup helper
function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

test.describe('BaselineComparator', () => {
  test.beforeAll(() => {
    cleanupTestDir();
  });

  test.afterAll(() => {
    cleanupTestDir();
  });

  test('compare() returns match:true for identical images', async () => {
    const comparator = createComparator({ threshold: 0.001 });
    
    // Create two identical red images
    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    const img2 = createTestImage(100, 100, [255, 0, 0, 255]);
    
    const path1 = saveTestImage(img1, 'identical-1.png');
    const path2 = saveTestImage(img2, 'identical-2.png');
    
    const result = await comparator.compare(path1, path2);
    
    expect(result.match).toBe(true);
    expect(result.diffPercentage).toBe(0);
    expect(result.diffPixels).toBe(0);
  });

  test('compare() returns match:false for different images', async () => {
    const comparator = createComparator({ threshold: 0.001 });
    
    // Create red and blue images
    const redImg = createTestImage(100, 100, [255, 0, 0, 255]);
    const blueImg = createTestImage(100, 100, [0, 0, 255, 255]);
    
    const redPath = saveTestImage(redImg, 'red.png');
    const bluePath = saveTestImage(blueImg, 'blue.png');
    
    const result = await comparator.compare(redPath, bluePath);
    
    expect(result.match).toBe(false);
    expect(result.diffPercentage).toBeGreaterThan(0);
    expect(result.diffPixels).toBeGreaterThan(0);
  });

  test('compare() returns correct diff percentage', async () => {
    const comparator = createComparator({ threshold: 0.001 });
    
    // Create a 10x10 image (100 pixels)
    const img1 = createTestImage(10, 10, [255, 0, 0, 255]);
    const img2 = createTestImage(10, 10, [255, 0, 0, 255]);
    
    // Modify 10 pixels in img2 (10% difference)
    for (let i = 0; i < 10 * 4; i += 4) {
      img2.data[i] = 0;       // R
      img2.data[i + 1] = 255; // G
    }
    
    const path1 = saveTestImage(img1, 'partial-1.png');
    const path2 = saveTestImage(img2, 'partial-2.png');
    
    const result = await comparator.compare(path1, path2);
    
    expect(result.diffPercentage).toBeCloseTo(10, 0);
    expect(result.diffPixels).toBe(10);
  });

  test('compare() handles dimension mismatch', async () => {
    const comparator = createComparator({ threshold: 0.001 });
    
    const smallImg = createTestImage(50, 50, [255, 0, 0, 255]);
    const largeImg = createTestImage(100, 100, [255, 0, 0, 255]);
    
    const smallPath = saveTestImage(smallImg, 'small.png');
    const largePath = saveTestImage(largeImg, 'large.png');
    
    const result = await comparator.compare(smallPath, largePath);
    
    expect(result.match).toBe(false);
    expect(result.diffPercentage).toBe(100);
  });

  test('isWithinThreshold() returns correct boolean', () => {
    const comparator = createComparator({ threshold: 0.01 }); // 1%
    
    expect(comparator.isWithinThreshold(0)).toBe(true);
    expect(comparator.isWithinThreshold(0.5)).toBe(true);
    expect(comparator.isWithinThreshold(1)).toBe(true);
    expect(comparator.isWithinThreshold(1.5)).toBe(false);
    expect(comparator.isWithinThreshold(5)).toBe(false);
  });

  test('generateDiff() creates diff image file', async () => {
    const comparator = createComparator({ diffDir: TEST_DIR });
    
    const redImg = createTestImage(50, 50, [255, 0, 0, 255]);
    const greenImg = createTestImage(50, 50, [0, 255, 0, 255]);
    
    const redPath = saveTestImage(redImg, 'diff-red.png');
    const greenPath = saveTestImage(greenImg, 'diff-green.png');
    
    const diffPath = await comparator.generateDiff(redPath, greenPath);
    
    expect(fs.existsSync(diffPath)).toBe(true);
    expect(diffPath).toContain('-diff.png');
  });

  test('compare() includes taskId in result', async () => {
    const comparator = createComparator();
    
    const img = createTestImage(10, 10, [255, 0, 0, 255]);
    const imgPath = saveTestImage(img, 'task-test.png');
    
    const result = await comparator.compare(imgPath, imgPath, '3.1');
    
    expect(result.taskId).toBe('3.1');
  });

  test('compare() includes expected and actual paths', async () => {
    const comparator = createComparator();
    
    const img1 = createTestImage(10, 10, [255, 0, 0, 255]);
    const img2 = createTestImage(10, 10, [0, 255, 0, 255]);
    
    const actualPath = saveTestImage(img1, 'paths-actual.png');
    const baselinePath = saveTestImage(img2, 'paths-baseline.png');
    
    const result = await comparator.compare(actualPath, baselinePath);
    
    expect(result.actualPath).toBe(actualPath);
    expect(result.expectedPath).toBe(baselinePath);
  });

  test('createComparator() creates instance with custom config', () => {
    const comparator = createComparator({ threshold: 0.05 });
    
    expect(comparator.getThreshold()).toBe(0.05);
  });

  test('default threshold is 0.1%', () => {
    const comparator = createComparator();
    
    expect(comparator.getThreshold()).toBe(0.001);
  });

  test('generateDiffPathForTask() creates correct format', () => {
    const comparator = createComparator({ diffDir: TEST_DIR });
    
    const diffPath = comparator.generateDiffPathForTask('3.1', 1);
    
    expect(diffPath).toContain('task-3.1-1-diff.png');
    expect(diffPath).toContain(TEST_DIR);
  });

  test('compareAndSaveDiff() saves diff image with task format', async () => {
    const comparator = createComparator({ diffDir: TEST_DIR });
    
    const redImg = createTestImage(50, 50, [255, 0, 0, 255]);
    const greenImg = createTestImage(50, 50, [0, 255, 0, 255]);
    
    const actualPath = saveTestImage(redImg, 'compare-actual.png');
    const baselinePath = saveTestImage(greenImg, 'compare-baseline.png');
    
    const result = await comparator.compareAndSaveDiff(actualPath, baselinePath, '4.2', 1);
    
    expect(result.match).toBe(false);
    expect(result.diffPath).toBeDefined();
    expect(result.diffPath).toContain('task-4.2-1-diff.png');
    expect(fs.existsSync(result.diffPath!)).toBe(true);
  });

  test('compareAndSaveDiff() does not create diff for matching images', async () => {
    const comparator = createComparator({ diffDir: TEST_DIR });
    
    const img = createTestImage(50, 50, [255, 0, 0, 255]);
    
    const path1 = saveTestImage(img, 'match-1.png');
    const path2 = saveTestImage(img, 'match-2.png');
    
    const result = await comparator.compareAndSaveDiff(path1, path2, '5.1', 1);
    
    expect(result.match).toBe(true);
    expect(result.diffPath).toBeUndefined();
  });

  test('diff image shows red pixels where screenshots differ', async () => {
    const comparator = createComparator({ diffDir: TEST_DIR });
    
    // Create images with different colors
    const redImg = createTestImage(10, 10, [255, 0, 0, 255]);
    const blueImg = createTestImage(10, 10, [0, 0, 255, 255]);
    
    const redPath = saveTestImage(redImg, 'diff-test-red.png');
    const bluePath = saveTestImage(blueImg, 'diff-test-blue.png');
    
    const diffPath = await comparator.generateDiff(redPath, bluePath);
    
    // Load the diff image and verify it has non-zero pixels (indicating differences)
    const diffBuffer = fs.readFileSync(diffPath);
    const diffPng = PNG.sync.read(diffBuffer);
    
    // Check that diff image has some colored pixels (not all black)
    let hasColoredPixels = false;
    for (let i = 0; i < diffPng.data.length; i += 4) {
      if (diffPng.data[i] > 0 || diffPng.data[i + 1] > 0 || diffPng.data[i + 2] > 0) {
        hasColoredPixels = true;
        break;
      }
    }
    
    expect(hasColoredPixels).toBe(true);
  });
});
