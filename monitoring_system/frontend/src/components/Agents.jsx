import React from 'react';
import { useMonitoring } from '../context/MonitoringContext';

const Agents = () => {
    const { agents, loading } = useMonitoring();

    // Safe data handling
    const safeAgents = Array.isArray(agents) ? agents : [];

    const StatusBadge = ({ isActive }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading agents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold">Monitoring Agents</h2>
                <p className="text-gray-600">List of all registered monitoring agents</p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hostname
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Username
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Seen
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Monitoring Scope
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Log Count
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {safeAgents.map((agent) => (
                            <tr key={agent.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="text-sm font-medium text-gray-900">
                                            {agent.hostname}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {agent.username}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge isActive={agent.is_active} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {agent.last_seen ? new Date(agent.last_seen).toLocaleString() : 'Never'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {agent.monitoring_scope === 'all_users' ? 'All Users' : `User: ${agent.specific_user}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {agent.log_count || 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {safeAgents.length === 0 && (
                    <div className="text-center py-12">
                        <span className="text-4xl">🔍</span>
                        <p className="text-gray-500 mt-2">No agents registered yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Install the monitoring agent on your servers to see them here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agents;