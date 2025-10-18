import axios from "axios";

// Create axios instance
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// CSRF token management
let csrfToken = null;

export const getCSRFToken = () => {
  return csrfToken;
};

export const setCSRFToken = (token) => {
  csrfToken = token;
  api.defaults.headers.common["X-CSRFToken"] = token;
};

// CSRF initialization
export const initializeCSRF = async () => {
  try {
    const response = await api.get("/csrf/");
    const token = response.data.csrfToken;
    setCSRFToken(token);
    console.log("CSRF token initialized");
  } catch (error) {
    console.error("Failed to initialize CSRF token:", error);
  }
};

// Unified API request handler using axios
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const config = {
      url: endpoint,
      method: options.method || "GET",
      data: options.body,
      ...options,
    };

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

// Debug utilities
export const debugAPI = {
  getAgents: async () => {
    try {
      const response = await api.get("/agents/");
      console.log("Raw agents response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Debug agents error:", error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const response = await api.get("/agents/stats/");
      console.log("Raw stats response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Debug stats error:", error);
      throw error;
    }
  },
};

// Agents
export const getAgents = async () => {
  try {
    const response = await api.get("/agents/");
    const data = response.data;

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

    console.log("🔍 API Request Params:", cleanParams);
    console.log("🔍 Full API URL:", `/metrics/`);

    const response = await api.get("/metrics/", { params: cleanParams });
    const data = response.data;

    // console.log("🔍 API Response:", data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return [];
  }
};

// Agent Registration Management
export const getPendingRegistrations = async () => {
  try {
    console.log("🔍 API Call - getPendingRegistrations");
    const response = await api.get("/registrations/pending/");
    console.log("🔍 API Response - getPendingRegistrations:", response.data);
    return response.data;
  } catch (error) {
    console.error("🔍 API Error - getPendingRegistrations:", error);
    return [];
  }
};

export const approveRegistration = async (requestId) => {
  try {
    const response = await api.post(`/registrations/${requestId}/approve/`);
    return response.data;
  } catch (error) {
    console.error("Approval API error:", error);
    throw error;
  }
};

export const rejectRegistration = async (requestId, data) => {
  try {
    const response = await api.post(
      `/registrations/${requestId}/reject/`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Rejection API error:", error);
    throw error;
  }
};

export const getRegistrationRequests = async () => {
  const response = await api.get("//");
  return response.data;
};

// Processes
export const getProcesses = async (hostname, page = 1, pageSize = 50) => {
  try {
    const response = await api.get("/processes/list/", {
      params: { hostname, page, page_size: pageSize },
    });
    return response.data;
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
export const getAlerts = async (filters = {}, page = 1, pageSize = 20) => {
  try {
    console.log("🔄 Fetching alerts with filters:", filters, "page:", page);

    const params = {
      page,
      page_size: pageSize,
      ...filters,
    };

    // Remove undefined values
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });

    console.log(`📡 Fetching alerts with params:`, params);
    const response = await api.get("/alerts/", { params });
    const data = response.data;

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
  const response = await api.post(`/alerts/${alertId}/resolve/`);
  return response.data;
};

export const unresolveAlert = async (alertId) => {
  const response = await api.post(`/alerts/${alertId}/unresolve/`);
  return response.data;
};

export const deleteAlert = async (alertId) => {
  const response = await api.delete(`/alerts/${alertId}/`);
  return response.data;
};

export const addAlertNote = async (alertId, note) => {
  const response = await api.post(`/alerts/${alertId}/add_note/`, { note });
  return response.data;
};

// Bulk operations
export const bulkResolveAlerts = async (alertIds) => {
  const response = await api.post("/alerts/bulk_resolve/", {
    alert_ids: alertIds,
  });
  return response.data;
};

export const bulkUnresolveAlerts = async (alertIds) => {
  const response = await api.post("/alerts/bulk_unresolve/", {
    alert_ids: alertIds,
  });
  return response.data;
};

export const bulkDeleteAlerts = async (alertIds) => {
  const response = await api.post("/alerts/bulk_delete/", {
    alert_ids: alertIds,
  });
  return response.data;
};

// Stats
export const getStats = async () => {
  try {
    const response = await api.get("/agents/stats/");
    return response.data;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      total_agents: 0,
      active_agents: 0,
      pending_registrations: 0,
      recent_logs_count: 0,
      alerts_count: 0,
    };
  }
};

// Settings
export const getThresholds = async () => {
  try {
    const response = await api.get("/thresholds/");
    const data = response.data;
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
    const response = await api.get("/notifications/");
    const data = response.data;
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
