import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Use Vite's import.meta.env instead of process.env
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const MonitoringContext = createContext();

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

export const MonitoringProvider = ({ children }) => {
  const [agents, setAgents] = useState([]); // Already an array
  const [alerts, setAlerts] = useState([]); // Already an array
  const [stats, setStats] = useState({});
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_BASE}/agents/`);
      // Ensure we always set an array
      setAgents(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError('Failed to fetch agents');
      setAgents([]); // Set empty array on error
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/alerts/`);
      // Ensure we always set an array
      setAlerts(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to fetch alerts');
      setAlerts([]); // Set empty array on error
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/agents/stats/`);
      setStats(response.data || {});
      setError(null);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to fetch stats');
      setStats({});
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/logs/metrics/`);
      setMetrics(response.data || {});
      setError(null);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError('Failed to fetch metrics');
      setMetrics({});
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/resolve/`);
      fetchAlerts(); // Refresh alerts
      setError(null);
    } catch (error) {
      console.error('Error resolving alert:', error);
      setError('Failed to resolve alert');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAgents(),
          fetchAlerts(),
          fetchStats(),
          fetchMetrics()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Failed to initialize application');
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      if (!loading) {
        fetchAgents();
        fetchAlerts();
        fetchStats();
        fetchMetrics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    agents,
    alerts,
    stats,
    metrics,
    loading,
    error,
    fetchAgents,
    fetchAlerts,
    fetchStats,
    fetchMetrics,
    resolveAlert,
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};