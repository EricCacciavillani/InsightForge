import { test, expect } from '@playwright/test';
import { ElectronTestRunner, createTestRunner } from './utils/electron-launcher';

test.describe('Electron Launcher', () => {
  let runner: ElectronTestRunner;

  test.afterEach(async () => {
    // Ensure cleanup after each test
    if (runner?.isRunning()) {
      await runner.close();
    }
  });

  test('launcher creates ElectronTestRunner instance', () => {
    runner = createTestRunner();
    expect(runner).toBeInstanceOf(ElectronTestRunner);
    expect(runner.isRunning()).toBe(false);
  });

  test('launcher launches Electron app in test mode', async () => {
    runner = createTestRunner();
    
    const app = await runner.launch();
    expect(app).toBeDefined();
    expect(runner.isRunning()).toBe(true);
    
    // Verify we can get the main window
    const window = await runner.getMainWindow();
    expect(window).toBeDefined();
    
    // Verify the app is running (window has a title or URL)
    const title = await window.title();
    expect(typeof title).toBe('string');
  });

  test('launcher closes Electron app properly', async () => {
    runner = createTestRunner();
    
    await runner.launch();
    expect(runner.isRunning()).toBe(true);
    
    await runner.close();
    expect(runner.isRunning()).toBe(false);
  });

  test('launcher throws error when launching twice', async () => {
    runner = createTestRunner();
    
    await runner.launch();
    
    await expect(runner.launch()).rejects.toThrow('Electron app is already running');
  });

  test('launcher throws error when getting window before launch', async () => {
    runner = createTestRunner();
    
    await expect(runner.getMainWindow()).rejects.toThrow('Electron app not launched');
  });
});
