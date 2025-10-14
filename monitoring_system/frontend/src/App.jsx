import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Agents from './components/Agents';
import Alerts from './components/Alerts';
import Logs from './components/Logs';
import Navigation from './components/Navigation';
import { MonitoringProvider } from './context/MonitoringContext';
import './App.css';

function App() {
  return (
    <MonitoringProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/logs" element={<Logs />} />
            </Routes>
          </div>
        </div>
      </Router>
    </MonitoringProvider>
  );
}

export default App;