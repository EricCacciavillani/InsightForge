import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

export interface ElectronTestConfig {
  /** Path to the Electron main.js file */
  electronPath?: string;
  /** Path to the Electron executable (auto-detected if not provided) */
  executablePath?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Timeout for app launch in ms */
  timeout?: number;
}

const DEFAULT_CONFIG: Omit<Required<ElectronTestConfig>, 'executablePath'> & { executablePath?: string } = {
  electronPath: path.join(__dirname, '../../electron/main.js'),
  env: {},
  timeout: 30000,
};

/**
 * Check if running in WSL (Windows Subsystem for Linux)
 */
function isWSL(): boolean {
  try {
    // Check for WSL-specific indicators
    if (fs.existsSync('/proc/version')) {
      const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
      return version.includes('microsoft') || version.includes('wsl');
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Find the Electron executable path using the electron package's path
 */
function findElectronPath(): string {
  // Use the electron package's exported path - this is the most reliable method
  try {
    // The electron package exports the path to the executable
    const electronPath = require('electron');
    if (typeof electronPath === 'string' && fs.existsSync(electronPath)) {
      return electronPath;
    }
  } catch {
    // Fallback if require('electron') doesn't work
  }
  
  // Manual fallback: check node_modules
  const nodeModulesPath = path.resolve(__dirname, '../../node_modules/electron');
  
  // Detect if we're in WSL - need Windows executable even though platform reports linux
  const inWSL = isWSL();
  
  // Check for executables in order of likelihood
  const candidates = [
    path.join(nodeModulesPath, 'dist', 'electron.exe'),  // Windows
    path.join(nodeModulesPath, 'dist', 'electron'),       // Linux
    path.join(nodeModulesPath, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron'), // macOS
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  
  // Last resort: return based on platform (with WSL consideration)
  const platform = process.platform;
  if (platform === 'win32' || inWSL) {
    return candidates[0];
  } else if (platform === 'darwin') {
    return candidates[2];
  }
  return candidates[1];
}

/**
 * ElectronTestRunner - Launches and manages Electron app for testing
 * 
 * Sets TEST_MODE=true to skip Python backend launch during tests.
 */
export class ElectronTestRunner {
  private app: ElectronApplication | null = null;
  private config: ElectronTestConfig;

  constructor(config: ElectronTestConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Launch the Electron app in test mode
   * @returns The Electron application instance
   */
  async launch(): Promise<ElectronApplication> {
    if (this.app) {
      throw new Error('Electron app is already running. Call close() first.');
    }

    const electronMainPath = path.resolve(__dirname, '../../electron/main.js');
    const electronExePath = this.config.executablePath || findElectronPath();
    
    this.app = await electron.launch({
      executablePath: electronExePath,
      args: [electronMainPath],
      env: {
        ...process.env,
        TEST_MODE: 'true',
        NODE_ENV: 'development',
        ...this.config.env,
      },
      timeout: this.config.timeout || 30000,
    });

    return this.app;
  }

  /**
   * Get the main window page for testing
   * @returns The main window Page object
   */
  async getMainWindow(): Promise<Page> {
    if (!this.app) {
      throw new Error('Electron app not launched. Call launch() first.');
    }

    // Wait for the first window to open
    const window = await this.app.firstWindow();
    
    // Wait for the page to be ready
    await window.waitForLoadState('domcontentloaded');
    
    return window;
  }

  /**
   * Close the Electron app
   */
  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
  }

  /**
   * Check if the app is currently running
   */
  isRunning(): boolean {
    return this.app !== null;
  }

  /**
   * Get the underlying Electron application instance
   */
  getApp(): ElectronApplication | null {
    return this.app;
  }
}

/**
 * Create a new ElectronTestRunner instance with default config
 */
export function createTestRunner(config?: ElectronTestConfig): ElectronTestRunner {
  return new ElectronTestRunner(config);
}

export default ElectronTestRunner;
