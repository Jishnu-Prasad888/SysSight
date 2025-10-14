import React, { useState } from 'react';
import { useMonitoring } from '../context/MonitoringContext';

const Logs = () => {
    const { agents, loading } = useMonitoring();
    const [selectedAgent, setSelectedAgent] = useState('');
    const [timeRange, setTimeRange] = useState('24');

    // Safe data handling
    const safeAgents = Array.isArray(agents) ? agents : [];

    // Sample logs data - in real app, you'd fetch this from API
    const sampleLogs = [
        {
            id: 1,
            agent_hostname: 'server-01',
            timestamp: new Date().toISOString(),
            data: {
                resource_anomalies: { cpu_percent: 45, memory_percent: 60 },
                authentication: { failed_login_attempts: 2 }
            }
        },
        {
            id: 2,
            agent_hostname: 'server-02',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            data: {
                resource_anomalies: { cpu_percent: 80, memory_percent: 75 },
                authentication: { failed_login_attempts: 5 }
            }
        },
    ];

    const logs = sampleLogs; // Replace with actual logs from context

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">System Logs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Agent
                        </label>
                        <select
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Agents</option>
                            {safeAgents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.hostname}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Range
                        </label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="1">Last 1 hour</option>
                            <option value="6">Last 6 hours</option>
                            <option value="24">Last 24 hours</option>
                            <option value="168">Last 7 days</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Agent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    CPU Usage
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Memory Usage
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Failed Logins
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {log.agent_hostname}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded-full text-xs ${log.data.resource_anomalies.cpu_percent > 80
                                                ? 'bg-red-100 text-red-800'
                                                : log.data.resource_anomalies.cpu_percent > 60
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                            {log.data.resource_anomalies.cpu_percent}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded-full text-xs ${log.data.resource_anomalies.memory_percent > 80
                                                ? 'bg-red-100 text-red-800'
                                                : log.data.resource_anomalies.memory_percent > 60
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                            {log.data.resource_anomalies.memory_percent}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded-full text-xs ${log.data.authentication.failed_login_attempts > 5
                                                ? 'bg-red-100 text-red-800'
                                                : log.data.authentication.failed_login_attempts > 0
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                            {log.data.authentication.failed_login_attempts}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logs.length === 0 && (
                        <div className="text-center py-12">
                            <span className="text-4xl">📋</span>
                            <p className="text-gray-500 mt-2">No logs found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Logs will appear here once agents start sending data
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Logs;