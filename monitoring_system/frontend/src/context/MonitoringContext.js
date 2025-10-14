import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const MonitoringContext = createContext();

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error("useMonitoring must be used within a MonitoringProvider");
  }
  return context;
};

export const MonitoringProvider = ({ children }) => {
  const [agents, setAgents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [metrics, setMetrics] = useState({});

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_BASE}/agents/`);
      setAgents(response.data);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/alerts/`);
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/agents/stats/`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/logs/metrics/`);
      setMetrics(response.data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/resolve/`);
      fetchAlerts(); // Refresh alerts
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchAlerts();
    fetchStats();
    fetchMetrics();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAgents();
      fetchAlerts();
      fetchStats();
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    agents,
    alerts,
    stats,
    metrics,
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
