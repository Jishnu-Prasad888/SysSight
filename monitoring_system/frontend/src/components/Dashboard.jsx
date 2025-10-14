import React from 'react';
import { useMonitoring } from '../context/MonitoringContext';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { stats, metrics, alerts, loading } = useMonitoring();

  // Safe data handling
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safeStats = stats || {};
  const safeMetrics = metrics || {};

  const StatCard = ({ title, value, color, icon }) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );

  const AlertCard = ({ alert }) => (
    <div className={`p-4 rounded-lg border-l-4 ${alert.level === 'critical' ? 'border-red-500 bg-red-50' :
        alert.level === 'high' ? 'border-orange-500 bg-orange-50' :
          alert.level === 'medium' ? 'border-yellow-500 bg-yellow-50' :
            'border-blue-500 bg-blue-50'
      }`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold">{alert.title}</h4>
          <p className="text-sm text-gray-600">{alert.description}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${alert.level === 'critical' ? 'bg-red-100 text-red-800' :
            alert.level === 'high' ? 'bg-orange-100 text-orange-800' :
              alert.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
          }`}>
          {alert.level}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {new Date(alert.triggered_at).toLocaleString()}
      </p>
    </div>
  );

  // Sample data for demonstration
  const sampleCpuData = [
    { timestamp: '14:00', avg_cpu: 25 },
    { timestamp: '14:05', avg_cpu: 30 },
    { timestamp: '14:10', avg_cpu: 45 },
    { timestamp: '14:15', avg_cpu: 35 },
    { timestamp: '14:20', avg_cpu: 28 },
  ];

  const sampleMemoryData = [
    { timestamp: '14:00', avg_memory: 60 },
    { timestamp: '14:05', avg_memory: 65 },
    { timestamp: '14:10', avg_memory: 70 },
    { timestamp: '14:15', avg_memory: 68 },
    { timestamp: '14:20', avg_memory: 62 },
  ];

  const sampleFailedLogins = [
    { hour: '14:00', total_failed: 2 },
    { hour: '15:00', total_failed: 5 },
    { hour: '16:00', total_failed: 1 },
    { hour: '17:00', total_failed: 8 },
    { hour: '18:00', total_failed: 3 },
  ];

  // Use safe data with fallbacks
  const cpuData = Array.isArray(safeMetrics.cpu_usage) && safeMetrics.cpu_usage.length > 0 ? safeMetrics.cpu_usage : sampleCpuData;
  const memoryData = Array.isArray(safeMetrics.memory_usage) && safeMetrics.memory_usage.length > 0 ? safeMetrics.memory_usage : sampleMemoryData;
  const failedLoginsData = Array.isArray(safeMetrics.failed_logins) && safeMetrics.failed_logins.length > 0 ? safeMetrics.failed_logins : sampleFailedLogins;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Agents"
          value={safeStats.total_agents || 0}
          color="border-blue-500"
          icon="🖥️"
        />
        <StatCard
          title="Active Agents"
          value={safeStats.active_agents || 0}
          color="border-green-500"
          icon="✅"
        />
        <StatCard
          title="Recent Logs"
          value={safeStats.recent_logs_count || 0}
          color="border-purple-500"
          icon="📊"
        />
        <StatCard
          title="Active Alerts"
          value={safeStats.alerts_count || 0}
          color="border-red-500"
          icon="🚨"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CPU Usage (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="avg_cpu" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Memory Usage (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={memoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="avg_memory" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Logins Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Failed Login Attempts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={failedLoginsData}>
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
            {safeAlerts.slice(0, 5).map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
            {safeAlerts.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl">🎉</span>
                <p className="text-gray-500 mt-2">No active alerts</p>
                <p className="text-sm text-gray-400 mt-1">
                  All systems are running smoothly
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;