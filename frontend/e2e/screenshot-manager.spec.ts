import { test, expect } from '@playwright/test';
import { 
  ScreenshotManager, 
  createScreenshotManager, 
  generateFilename, 
  parseFilename 
} from './utils/screenshot-manager';
import { ElectronTestRunner, createTestRunner } from './utils/electron-launcher';
import path from 'path';
import fs from 'fs';

test.describe('ScreenshotManager', () => {
  let runner: ElectronTestRunner;
  let manager: ScreenshotManager;
  const testScreenshotDir = path.join(__dirname, 'test-screenshots-temp');

  test.beforeEach(() => {
    // Create manager with temp directory for testing
    manager = createScreenshotManager({
      screenshotDir: testScreenshotDir,
      baselineDir: path.join(testScreenshotDir, 'baselines'),
      actualDir: path.join(testScreenshotDir, 'actuals'),
      diffDir: path.join(testScreenshotDir, 'diffs'),
    });
  });

  test.afterEach(async () => {
    // Cleanup Electron if running
    if (runner?.isRunning()) {
      await runner.close();
    }
    
    // Cleanup temp directory
    if (fs.existsSync(testScreenshotDir)) {
      fs.rmSync(testScreenshotDir, { recursive: true, force: true });
    }
  });

  test.describe('Filename Generation', () => {
    test('generateFilename creates correct format', () => {
      const filename = generateFilename('3.1', 1);
      expect(filename).toBe('task-3.1-1.png');
    });

    test('generateFilename handles multi-digit indices', () => {
      const filename = generateFilename('4.2', 10);
      expect(filename).toBe('task-4.2-10.png');
    });

    test('generateFilename sanitizes special characters', () => {
      const filename = generateFilename('test/task', 1);
      expect(filename).toBe('task-test-task-1.png');
    });

    test('parseFilename extracts task ID and index', () => {
      const result = parseFilename('task-3.1-1.png');
      expect(result).toEqual({ taskId: '3.1', index: 1 });
    });

    test('parseFilename returns null for invalid format', () => {
      expect(parseFilename('invalid.png')).toBeNull();
      expect(parseFilename('task-3.1.png')).toBeNull();
      expect(parseFilename('screenshot.jpg')).toBeNull();
    });
  });

  test.describe('ScreenshotManager Instance', () => {
    test('createScreenshotManager creates instance', () => {
      const mgr = createScreenshotManager();
      expect(mgr).toBeInstanceOf(ScreenshotManager);
    });

    test('manager creates directories on initialization', () => {
      const dirs = manager.getDirectories();
      expect(fs.existsSync(dirs.screenshotDir)).toBe(true);
      expect(fs.existsSync(dirs.baselineDir)).toBe(true);
      expect(fs.existsSync(dirs.actualDir)).toBe(true);
      expect(fs.existsSync(dirs.diffDir)).toBe(true);
    });

    test('manager auto-increments index for same task', () => {
      expect(manager.getCounter('3.1')).toBe(0);
      // Simulate what capture would do internally
      manager['getNextIndex']('3.1');
      expect(manager.getCounter('3.1')).toBe(1);
      manager['getNextIndex']('3.1');
      expect(manager.getCounter('3.1')).toBe(2);
    });

    test('manager tracks separate counters per task', () => {
      manager['getNextIndex']('3.1');
      manager['getNextIndex']('3.1');
      manager['getNextIndex']('4.2');
      
      expect(manager.getCounter('3.1')).toBe(2);
      expect(manager.getCounter('4.2')).toBe(1);
    });

    test('resetCounters clears all counters', () => {
      manager['getNextIndex']('3.1');
      manager['getNextIndex']('4.2');
      manager.resetCounters();
      
      expect(manager.getCounter('3.1')).toBe(0);
      expect(manager.getCounter('4.2')).toBe(0);
    });
  });

  test.describe('Screenshot Capture with Electron', () => {
    test('capture saves screenshot with task ID in filename', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      const screenshotPath = await manager.capture(page, '3.1');
      
      expect(fs.existsSync(screenshotPath)).toBe(true);
      expect(path.basename(screenshotPath)).toBe('task-3.1-1.png');
    });

    test('capture uses explicit index when provided', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      const screenshotPath = await manager.capture(page, '3.1', 5);
      
      expect(path.basename(screenshotPath)).toBe('task-3.1-5.png');
    });

    test('capture stores in actuals directory', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      const screenshotPath = await manager.capture(page, '4.2');
      const dirs = manager.getDirectories();
      
      expect(screenshotPath.startsWith(dirs.actualDir)).toBe(true);
    });

    test('multiple captures increment index sequentially', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      const path1 = await manager.capture(page, '3.1');
      const path2 = await manager.capture(page, '3.1');
      const path3 = await manager.capture(page, '3.1');
      
      expect(path.basename(path1)).toBe('task-3.1-1.png');
      expect(path.basename(path2)).toBe('task-3.1-2.png');
      expect(path.basename(path3)).toBe('task-3.1-3.png');
    });
  });

  test.describe('Baseline Management', () => {
    test('getBaseline returns null when no baseline exists', () => {
      const baseline = manager.getBaseline('nonexistent', 1);
      expect(baseline).toBeNull();
    });

    test('saveAsBaseline copies screenshot to baselines directory', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      const screenshotPath = await manager.capture(page, '3.1');
      await manager.saveAsBaseline(screenshotPath);
      
      const baseline = manager.getBaseline('3.1', 1);
      expect(baseline).not.toBeNull();
      expect(fs.existsSync(baseline!)).toBe(true);
    });

    test('listScreenshots returns all screenshots', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      await manager.capture(page, '3.1');
      await manager.capture(page, '3.1');
      await manager.capture(page, '4.2');
      
      const all = manager.listScreenshots();
      expect(all).toHaveLength(3);
    });

    test('listScreenshots filters by task ID', async () => {
      runner = createTestRunner();
      await runner.launch();
      const page = await runner.getMainWindow();
      
      await manager.capture(page, '3.1');
      await manager.capture(page, '3.1');
      await manager.capture(page, '4.2');
      
      const filtered = manager.listScreenshots('3.1');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(f => f.includes('3.1'))).toBe(true);
    });
  });
});
