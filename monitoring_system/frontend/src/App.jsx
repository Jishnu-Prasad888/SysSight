// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
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
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/alerts" element={<AlertsPanel />} />
                        <Route path="/agents" element={<AgentRegistrationManager />} />
                        <Route path="/metrics" element={<HostMetrics />} />
                        <Route path="/processes" element={<ProcessMonitor />} />
                        <Route path="/settings" element={<Settings />} />
                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;