import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RunOrchestrator from './pages/RunOrchestrator';
import Results from './pages/Results';
import Settings from './pages/Settings';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { OfflineProvider, useOffline } from './contexts/OfflineContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isOnline, queuedActions, isRetrying } = useOffline();

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-background">
        <Titlebar 
          backendConnected={isOnline} 
          queuedCount={queuedActions.length}
          isRetrying={isRetrying}
        />
        {/* Offline Banner */}
        {isOnline === false && (
          <div className="bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-center gap-2">
            <WifiOff size={16} />
            <span>
              Backend offline. 
              {queuedActions.length > 0 
                ? ` ${queuedActions.length} action(s) queued - will retry when reconnected.`
                : ' Start the API server with:'
              }
            </span>
            {queuedActions.length === 0 && (
              <code className="bg-red-700 px-2 py-0.5 rounded">python -m api.server</code>
            )}
          </div>
        )}
        {/* Retrying Banner */}
        {isOnline === true && isRetrying && queuedActions.length > 0 && (
          <div className="bg-blue-600 text-white px-4 py-2 text-sm flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Syncing {queuedActions.length} queued action(s)...</span>
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
          <main className="flex-1 overflow-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/run" element={<RunOrchestrator />} />
              <Route path="/results" element={<Results />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <OfflineProvider>
            <AppContent />
          </OfflineProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
