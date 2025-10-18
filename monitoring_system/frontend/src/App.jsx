// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { Loader } from 'lucide-react';

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const AlertsPanel = lazy(() => import('./components/AlertsPanel'));
const AgentRegistrationManager = lazy(() => import('./components/AgentRegistrationManager'));
const HostMetrics = lazy(() => import('./components/HostMetrics'));
const ProcessMonitor = lazy(() => import('./components/ProcessMonitor'));
const Settings = lazy(() => import('./components/Settings'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [user] = React.useState({
    username: 'admin',
    role: 'Administrator'
  });

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Layout activeTab={currentView} onTabChange={setCurrentView} user={user}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/alerts" element={<AlertsPanel />} />
              <Route path="/agents" element={<AgentRegistrationManager />} />
              <Route path="/metrics" element={<HostMetrics />} />
              <Route path="/processes" element={<ProcessMonitor />} />
              <Route path="/settings" element={<Settings />} />
              {/* Catch all route */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;