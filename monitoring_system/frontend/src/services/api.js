// src/services/api.js
const API_BASE = "/api";

// Simple CSRF token getter
const getCSRFToken = () => {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];
  return cookieValue || "";
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  console.log("in apiRequest");
  console.log(url);
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const method = options.method ? options.method.toUpperCase() : "GET";
  if (method !== "GET") {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }
  }

  const config = {
    credentials: "include",
    ...options,
    headers,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    // FIX: Handle both paginated and non-paginated responses
    if (data && typeof data === "object") {
      // If it's a paginated response with 'results' field
      if (data.results !== undefined) {
        return data.results;
      }
      // If it's a stats object or other direct object
      if (Object.keys(data).length > 0 && !data.id && !Array.isArray(data)) {
        return data;
      }
    }

    return data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

export const debugAPI = {
  getAgents: async () => {
    try {
      const response = await fetch("/api/agents/");
      const data = await response.json();
      console.log("Raw agents response:", data);
      return data;
    } catch (error) {
      console.error("Debug agents error:", error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const response = await fetch("/api/agents/stats/");
      const data = await response.json();
      console.log("Raw stats response:", data);
      return data;
    } catch (error) {
      console.error("Debug stats error:", error);
      throw error;
    }
  },
};

// Agents
export const getAgents = () => apiRequest("/agents/");
export const getAgentStats = () => apiRequest("/agents/stats/");

// Metrics
export const getMetrics = async (params = {}) => {
  try {
    // Clean up parameters - remove null/undefined values
    const cleanParams = {};
    Object.keys(params).forEach((key) => {
      if (
        params[key] !== null &&
        params[key] !== undefined &&
        params[key] !== "null"
      ) {
        cleanParams[key] = params[key];
      }
    });

    const queryString = new URLSearchParams(cleanParams).toString();
    const data = await apiRequest(`/metrics/?${queryString}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return [];
  }
};

// Processes
export const getProcesses = (hostname, page = 1, pageSize = 50) => {
  console.log("inside getProcesses");
  return apiRequest(
    `/processes/list/?hostname=${hostname}&page=${page}&page_size=${pageSize}`
  );
};

// Alerts
export const getAlerts = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  return apiRequest(`/alerts/?${queryString}`);
};

export const resolveAlert = (alertId) => {
  return apiRequest(`/alerts/${alertId}/resolve/`, {
    method: "POST",
    body: {},
  });
};

// Stats
export const getStats = () => apiRequest("/agents/stats/");

// Settings
export const getThresholds = () => apiRequest("/thresholds/");
export const createThreshold = (data) =>
  apiRequest("/thresholds/", { method: "POST", body: data });
export const updateThreshold = (id, data) =>
  apiRequest(`/thresholds/${id}/`, { method: "PUT", body: data });
export const deleteThreshold = (id) =>
  apiRequest(`/thresholds/${id}/`, { method: "DELETE" });

export const getNotificationChannels = () => apiRequest("/notifications/");
export const createNotificationChannel = (data) =>
  apiRequest("/notifications/", { method: "POST", body: data });
export const updateNotificationChannel = (id, data) =>
  apiRequest(`/notifications/${id}/`, { method: "PUT", body: data });
export const deleteNotificationChannel = (id) =>
  apiRequest(`/notifications/${id}/`, { method: "DELETE" });

// Initialize CSRF token
export const initializeCSRF = async () => {
  try {
    await apiRequest("/csrf/");
    console.log("CSRF token initialized");
    return true;
  } catch (error) {
    console.warn("CSRF initialization failed, continuing without CSRF:", error);
    return true; // Continue anyway for development
  }
};
