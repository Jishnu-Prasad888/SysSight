import React from "react";
import { useMonitoring } from "../context/MonitoringContext";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const { stats, metrics, alerts } = useMonitoring();

  const StatCard = ({ title, value, color }) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );

  const AlertCard = ({ alert }) => (
    <div
      className={`p-4 rounded-lg border-l-4 ${
        alert.level === "critical"
          ? "border-red-500 bg-red-50"
          : alert.level === "high"
          ? "border-orange-500 bg-orange-50"
          : alert.level === "medium"
          ? "border-yellow-500 bg-yellow-50"
          : "border-blue-500 bg-blue-50"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold">{alert.title}</h4>
          <p className="text-sm text-gray-600">{alert.description}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            alert.level === "critical"
              ? "bg-red-100 text-red-800"
              : alert.level === "high"
              ? "bg-orange-100 text-orange-800"
              : alert.level === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {alert.level}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {new Date(alert.triggered_at).toLocaleString()}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Agents"
          value={stats.total_agents || 0}
          color="border-blue-500"
        />
        <StatCard
          title="Active Agents"
          value={stats.active_agents || 0}
          color="border-green-500"
        />
        <StatCard
          title="Recent Logs"
          value={stats.recent_logs_count || 0}
          color="border-purple-500"
        />
        <StatCard
          title="Active Alerts"
          value={stats.alerts_count || 0}
          color="border-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CPU Usage (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.cpu_usage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="avg_cpu"
                stroke="#8884d8"
                fill="#8884d8"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Memory Usage (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.memory_usage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="avg_memory"
                stroke="#82ca9d"
                fill="#82ca9d"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Logins Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Failed Login Attempts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.failed_logins || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_failed" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
            {alerts.length === 0 && (
              <p className="text-gray-500 text-center py-4">No active alerts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
