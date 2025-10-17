// src/App.js
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import HostMetrics from './components/HostMetrics';
import ProcessMonitor from './components/ProcessMonitor';
import AlertsPanel from './components/AlertsPanel';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import { initializeCSRF } from './services/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedHost, setSelectedHost] = useState('');
  const [csrfReady, setCsrfReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await initializeCSRF();
      setCsrfReady(true);
    };

    initApp();
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onHostSelect={setSelectedHost} />;
      case 'metrics':
        return <HostMetrics host={selectedHost} />;
      case 'processes':
        return <ProcessMonitor host={selectedHost} />;
      case 'alerts':
        return <AlertsPanel />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onHostSelect={setSelectedHost} />;
    }
  };

  if (!csrfReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-lg text-gray-600">Initializing application...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedHost={selectedHost}
      />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;