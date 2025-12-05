const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isTestMode = process.env.TEST_MODE === 'true';
const CONDA_ENV_NAME = 'InsightForge';

// Log test mode status
if (isTestMode) {
  console.log('[Electron] Running in TEST_MODE - Python backend will be skipped');
}

/**
 * Detect conda installation and get the path to conda executable
 */
function findCondaPath() {
  const possiblePaths = process.platform === 'win32'
    ? [
        path.join(process.env.USERPROFILE || '', 'miniconda3', 'Scripts', 'conda.exe'),
        path.join(process.env.USERPROFILE || '', 'anaconda3', 'Scripts', 'conda.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'miniconda3', 'Scripts', 'conda.exe'),
        path.join(process.env.PROGRAMDATA || '', 'miniconda3', 'Scripts', 'conda.exe'),
        path.join(process.env.PROGRAMDATA || '', 'anaconda3', 'Scripts', 'conda.exe'),
      ]
    : [
        path.join(process.env.HOME || '', 'miniconda3', 'bin', 'conda'),
        path.join(process.env.HOME || '', 'anaconda3', 'bin', 'conda'),
        '/opt/conda/bin/conda',
        '/usr/local/bin/conda',
      ];

  for (const condaPath of possiblePaths) {
    if (fs.existsSync(condaPath)) {
      return condaPath;
    }
  }

  // Try to find conda in PATH
  try {
    const which = process.platform === 'win32' ? 'where conda' : 'which conda';
    const result = execSync(which, { encoding: 'utf8' }).trim().split('\n')[0];
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // conda not in PATH
  }

  return null;
}

/**
 * Get the Python executable path for the conda environment
 */
function getCondaPythonPath(condaPath) {
  try {
    const condaInfo = execSync(`"${condaPath}" info --json`, { encoding: 'utf8' });
    const info = JSON.parse(condaInfo);
    const envs = info.envs || [];
    
    // Find our environment
    for (const envPath of envs) {
      if (envPath.includes(CONDA_ENV_NAME)) {
        const pythonExe = process.platform === 'win32'
          ? path.join(envPath, 'python.exe')
          : path.join(envPath, 'bin', 'python');
        if (fs.existsSync(pythonExe)) {
          return pythonExe;
        }
      }
    }

    // Check default env locations
    const condaRoot = path.dirname(path.dirname(condaPath));
    const envPath = path.join(condaRoot, 'envs', CONDA_ENV_NAME);
    const pythonExe = process.platform === 'win32'
      ? path.join(envPath, 'python.exe')
      : path.join(envPath, 'bin', 'python');
    
    if (fs.existsSync(pythonExe)) {
      return pythonExe;
    }
  } catch (err) {
    console.error('[Conda] Error getting Python path:', err.message);
  }
  return null;
}

/**
 * Check if conda environment exists
 */
function condaEnvExists(condaPath) {
  try {
    const result = execSync(`"${condaPath}" env list`, { encoding: 'utf8' });
    return result.includes(CONDA_ENV_NAME);
  } catch {
    return false;
  }
}

/**
 * Create conda environment from environment.yml
 */
function createCondaEnv(condaPath) {
  const envYmlPath = isDev
    ? path.join(__dirname, '../../environment.yml')
    : path.join(process.resourcesPath, 'environment.yml');

  if (!fs.existsSync(envYmlPath)) {
    console.error('[Conda] environment.yml not found at:', envYmlPath);
    return false;
  }

  console.log('[Conda] Creating environment from:', envYmlPath);
  try {
    execSync(`"${condaPath}" env create -f "${envYmlPath}" -n ${CONDA_ENV_NAME}`, {
      encoding: 'utf8',
      stdio: 'inherit',
    });
    console.log('[Conda] Environment created successfully');
    return true;
  } catch (err) {
    console.error('[Conda] Failed to create environment:', err.message);
    return false;
  }
}

/**
 * Install/update packages in conda environment using pip
 */
function installPackages(condaPath, pythonPath) {
  const requirementsPath = isDev
    ? path.join(__dirname, '../../requirements.txt')
    : path.join(process.resourcesPath, 'requirements.txt');

  if (!fs.existsSync(requirementsPath)) {
    console.log('[Conda] No requirements.txt found, skipping pip install');
    return true;
  }

  console.log('[Conda] Installing packages from requirements.txt');
  try {
    execSync(`"${pythonPath}" -m pip install -r "${requirementsPath}" --quiet`, {
      encoding: 'utf8',
      stdio: 'inherit',
    });
    console.log('[Conda] Packages installed successfully');
    return true;
  } catch (err) {
    console.error('[Conda] Failed to install packages:', err.message);
    return false;
  }
}

/**
 * Ensure conda environment is set up and ready
 */
function ensureCondaEnv(condaPath) {
  if (!condaEnvExists(condaPath)) {
    console.log(`[Conda] Environment '${CONDA_ENV_NAME}' not found, creating...`);
    if (!createCondaEnv(condaPath)) {
      return null;
    }
  }

  const pythonPath = getCondaPythonPath(condaPath);
  if (pythonPath) {
    // Ensure packages are up to date
    installPackages(condaPath, pythonPath);
  }
  return pythonPath;
}

/**
 * Resolve the best Python executable to use
 * Priority: conda env > system python > bundled python
 */
function resolvePythonPath() {
  // In production, prefer bundled Python
  if (!isDev) {
    const bundledPython = path.join(process.resourcesPath, 'python', 'python.exe');
    if (fs.existsSync(bundledPython)) {
      console.log('[Python] Using bundled Python');
      return bundledPython;
    }
  }

  // Try conda environment
  const condaPath = findCondaPath();
  if (condaPath) {
    console.log('[Conda] Found conda at:', condaPath);
    const condaPython = ensureCondaEnv(condaPath);
    if (condaPython) {
      console.log('[Python] Using conda environment:', condaPython);
      return condaPython;
    }
    console.log('[Conda] Environment setup failed, will use system Python');
  }

  // Fallback to system Python
  console.log('[Python] Using system Python');
  return 'python';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false, // Custom titlebar
    backgroundColor: '#0a0a0b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  const pythonPath = resolvePythonPath();
  const scriptPath = isDev 
    ? path.join(__dirname, '../../api/server.py')
    : path.join(process.resourcesPath, 'api', 'server.py');

  console.log(`[Python] Starting backend with: ${pythonPath}`);
  console.log(`[Python] Script path: ${scriptPath}`);

  // Set up environment with conda activation if needed
  const env = { ...process.env };
  
  pythonProcess = spawn(pythonPath, ['-m', 'api.server'], {
    cwd: isDev ? path.join(__dirname, '../..') : process.resourcesPath,
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    console.log(`[Python] ${msg}`);
    // Notify renderer when backend is ready
    if (msg.includes('Uvicorn running') || msg.includes('Application startup complete')) {
      mainWindow?.webContents.send('backend-ready');
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    // Uvicorn logs to stderr by default
    if (msg.includes('INFO') || msg.includes('Uvicorn running')) {
      console.log(`[Python] ${msg}`);
      if (msg.includes('Uvicorn running') || msg.includes('Application startup complete')) {
        mainWindow?.webContents.send('backend-ready');
      }
    } else {
      console.error(`[Python Error] ${msg}`);
    }
  });

  pythonProcess.on('error', (err) => {
    console.error(`[Python] Failed to start: ${err.message}`);
    mainWindow?.webContents.send('backend-error', err.message);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Python] Process exited with code ${code}`);
    if (code !== 0 && code !== null) {
      mainWindow?.webContents.send('backend-error', `Process exited with code ${code}`);
    }
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// Backend controls
ipcMain.handle('get-python-info', () => {
  const pythonPath = resolvePythonPath();
  const condaPath = findCondaPath();
  return {
    pythonPath,
    condaPath,
    condaEnv: CONDA_ENV_NAME,
    isCondaEnv: pythonPath.includes(CONDA_ENV_NAME),
  };
});

ipcMain.handle('restart-backend', async () => {
  stopPythonBackend();
  await new Promise((resolve) => setTimeout(resolve, 500));
  startPythonBackend();
  return { success: true };
});

ipcMain.handle('setup-conda-env', async () => {
  const condaPath = findCondaPath();
  if (!condaPath) {
    return { success: false, error: 'Conda not found' };
  }

  try {
    const pythonPath = ensureCondaEnv(condaPath);
    if (pythonPath) {
      return { success: true, pythonPath };
    }
    return { success: false, error: 'Failed to setup environment' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  // Skip Python backend in test mode
  if (!isTestMode) {
    startPythonBackend();
  } else {
    console.log('[Electron] TEST_MODE: Skipping Python backend launch');
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isTestMode) {
    stopPythonBackend();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (!isTestMode) {
    stopPythonBackend();
  }
});
