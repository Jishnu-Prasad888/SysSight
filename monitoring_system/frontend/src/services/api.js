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

// Unified API request handler
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;

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
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

// Response handler for fetch requests
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  if (response.status === 204) {
    return { status: "success" };
  }

  return response.json();
};

// Debug utilities
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
export const getAgents = async () => {
  try {
    const response = await fetch("/api/agents/");
    const data = await handleResponse(response);

    // Ensure we always return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && data.results) {
      return data.results;
    } else if (data && typeof data === "object") {
      return [data];
    } else {
      console.warn("Unexpected agents response format:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

export const getAgentStats = () => apiRequest("/agents/stats/");

// Metrics
// services/api.js
export const getMetrics = async (params = {}) => {
  try {
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
    console.log("🔍 API Request Params:", cleanParams);
    console.log("🔍 Full API URL:", `/metrics/?${queryString}`);

    const data = await apiRequest(`/metrics/?${queryString}`);
    console.log("🔍 API Response:", data);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return [];
  }
};

// Processes
export const getProcesses = async (hostname, page = 1, pageSize = 50) => {
  try {
    const response = await fetch(
      `/api/processes/list/?hostname=${hostname}&page=${page}&page_size=${pageSize}`
    );
    return await handleResponse(response);
  } catch (error) {
    console.error("Error fetching processes:", error);
    return {
      hostname,
      timestamp: new Date().toISOString(),
      total_processes: 0,
      root_processes: 0,
      page: 1,
      page_size: pageSize,
      total_pages: 0,
      top_cpu_processes: [],
      top_memory_processes: [],
      load_average: [],
    };
  }
};

// Alerts
// src/services/api.js - Update getAlerts function
export const getAlerts = async (filters = {}, page = 1, pageSize = 20) => {
  try {
    console.log("🔄 Fetching alerts with filters:", filters, "page:", page);
    const params = new URLSearchParams();

    if (filters.resolved !== undefined) {
      params.append("resolved", filters.resolved);
    }
    if (filters.level) {
      params.append("level", filters.level);
    }
    if (filters.agent) {
      params.append("agent", filters.agent);
    }
    if (filters.alert_type) {
      params.append("alert_type", filters.alert_type);
    }

    // Add pagination parameters
    params.append("page", page);
    params.append("page_size", pageSize);

    const queryString = params.toString();
    const url = queryString ? `/api/alerts/?${queryString}` : "/api/alerts/";

    console.log(`📡 Fetching from: ${url}`);
    const response = await fetch(url);
    const data = await handleResponse(response);

    // Handle paginated response
    if (data && data.results !== undefined) {
      console.log(
        `✅ Found ${data.results.length} alerts on page ${page} of ${data.count} total`
      );
      return {
        alerts: data.results,
        pagination: {
          current: page,
          pageSize: pageSize,
          total: data.count,
          totalPages: Math.ceil(data.count / pageSize),
          next: data.next,
          previous: data.previous,
        },
      };
    } else {
      // Fallback for non-paginated responses
      let alertsArray = [];
      if (Array.isArray(data)) {
        alertsArray = data;
      } else if (data && typeof data === "object") {
        alertsArray = Object.values(data);
      }

      alertsArray = alertsArray.filter(
        (item) => item && typeof item === "object" && (item.id || item.title)
      );

      console.log(`✅ Found ${alertsArray.length} alerts (non-paginated)`);
      return {
        alerts: alertsArray,
        pagination: {
          current: 1,
          pageSize: alertsArray.length,
          total: alertsArray.length,
          totalPages: 1,
          next: null,
          previous: null,
        },
      };
    }
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);
    return {
      alerts: [],
      pagination: {
        current: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        next: null,
        previous: null,
      },
    };
  }
};

export const resolveAlert = async (alertId) => {
  const response = await fetch(`/api/alerts/${alertId}/resolve/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
  });
  return handleResponse(response);
};

export const unresolveAlert = async (alertId) => {
  const response = await fetch(`/api/alerts/${alertId}/unresolve/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
  });
  return handleResponse(response);
};

export const deleteAlert = async (alertId) => {
  const response = await fetch(`/api/alerts/${alertId}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": getCSRFToken(),
    },
  });
  return handleResponse(response);
};

export const addAlertNote = async (alertId, note) => {
  const response = await fetch(`/api/alerts/${alertId}/add_note/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({ note }),
  });
  return handleResponse(response);
};

// Bulk operations
export const bulkResolveAlerts = async (alertIds) => {
  const response = await fetch("/api/alerts/bulk_resolve/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({ alert_ids: alertIds }),
  });
  return handleResponse(response);
};

export const bulkUnresolveAlerts = async (alertIds) => {
  const response = await fetch("/api/alerts/bulk_unresolve/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({ alert_ids: alertIds }),
  });
  return handleResponse(response);
};

export const bulkDeleteAlerts = async (alertIds) => {
  const response = await fetch("/api/alerts/bulk_delete/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({ alert_ids: alertIds }),
  });
  return handleResponse(response);
};

// Stats
export const getStats = () => apiRequest("/agents/stats/");

// Settings
export const getThresholds = async () => {
  try {
    const data = await apiRequest("/thresholds/");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching thresholds:", error);
    return [];
  }
};

export const createThreshold = (data) =>
  apiRequest("/thresholds/", { method: "POST", body: data });

export const updateThreshold = (id, data) =>
  apiRequest(`/thresholds/${id}/`, { method: "PUT", body: data });

export const deleteThreshold = (id) =>
  apiRequest(`/thresholds/${id}/`, { method: "DELETE" });

export const getNotificationChannels = async () => {
  try {
    const data = await apiRequest("/notifications/");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching notification channels:", error);
    return [];
  }
};

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
    return true;
  }
};

// Export CSRF token getter for other modules
export const getCsrfToken = getCSRFToken;
