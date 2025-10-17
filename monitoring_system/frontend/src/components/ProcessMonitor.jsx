// src/components/ProcessMonitor.jsx
import React, { useState, useEffect } from 'react';
import { getProcesses, getAgents } from '../services/api';

const ProcessMonitor = () => {
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('');
    const [processData, setProcessData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    useEffect(() => {
        loadAgents();
    }, []);

    useEffect(() => {
        if (selectedAgent) {
            loadProcesses();
        }
    }, [selectedAgent, currentPage, pageSize]);

    const loadAgents = async () => {
        try {
            setLoading(true);
            const agentsData = await getAgents();
            console.log('Agents data:', agentsData);

            // Ensure agents is always an array
            const agentsArray = Array.isArray(agentsData) ? agentsData : [];
            setAgents(agentsArray);

            if (agentsArray.length > 0 && !selectedAgent) {
                setSelectedAgent(agentsArray[0].hostname);
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    const loadProcesses = async () => {
        if (!selectedAgent) return;

        try {
            setLoading(true);
            const data = await getProcesses(selectedAgent, currentPage, pageSize);
            console.log('Process data:', data);
            setProcessData(data);
        } catch (error) {
            console.error('Failed to load processes:', error);
            setProcessData(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(Number(newSize));
        setCurrentPage(1);
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatPercentage = (value) => {
        return typeof value === 'number' ? value.toFixed(1) + '%' : '0%';
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Process Monitor</h1>

                <div className="flex space-x-4 items-center">
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="border rounded-lg px-3 py-2 min-w-[200px]"
                        disabled={loading}
                    >
                        <option value="">Select Agent</option>
                        {Array.isArray(agents) && agents.map(agent => (
                            <option key={agent.id} value={agent.hostname}>
                                {agent.hostname}
                            </option>
                        ))}
                    </select>

                    {processData && (
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(e.target.value)}
                            className="border rounded-lg px-3 py-2"
                        >
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                        </select>
                    )}
                </div>
            </div>

            {loading && (
                <div className="text-center py-8">Loading...</div>
            )}

            {!loading && selectedAgent && !processData && (
                <div className="text-center py-8 text-gray-500">
                    No process data available for {selectedAgent}
                </div>
            )}

            {processData && (
                <div className="space-y-6">
                    {/* System Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow border">
                            <h3 className="font-semibold text-gray-700">Total Processes</h3>
                            <p className="text-2xl font-bold text-blue-600">
                                {processData.total_processes || 0}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border">
                            <h3 className="font-semibold text-gray-700">Root Processes</h3>
                            <p className="text-2xl font-bold text-red-600">
                                {processData.root_processes || 0}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border">
                            <h3 className="font-semibold text-gray-700">Load Average</h3>
                            <p className="text-sm font-mono text-gray-600">
                                {processData.load_average ? processData.load_average.join(', ') : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow border">
                            <h3 className="font-semibold text-gray-700">Last Updated</h3>
                            <p className="text-sm text-gray-600">
                                {processData.timestamp ? new Date(processData.timestamp).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Top CPU Processes */}
                    <div className="bg-white rounded-lg shadow border">
                        <div className="p-4 border-b">
                            <h2 className="text-lg font-semibold">Top CPU Processes</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            PID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            CPU %
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Memory
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {processData.top_cpu_processes && processData.top_cpu_processes.length > 0 ? (
                                        processData.top_cpu_processes.map((process, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {process.pid || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {process.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${(process.cpu_percent || 0) > 50 ? 'bg-red-100 text-red-800' :
                                                            (process.cpu_percent || 0) > 20 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-green-100 text-green-800'
                                                        }`}>
                                                        {formatPercentage(process.cpu_percent)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatBytes(process.memory_usage || 0)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {process.username || 'Unknown'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                                No CPU process data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Memory Processes with Pagination */}
                    <div className="bg-white rounded-lg shadow border">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Top Memory Processes</h2>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {processData.total_pages || 1}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            PID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Memory Usage
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            CPU %
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {processData.top_memory_processes && processData.top_memory_processes.length > 0 ? (
                                        processData.top_memory_processes.map((process, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {process.pid || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {process.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${(process.memory_percent || 0) > 50 ? 'bg-red-100 text-red-800' :
                                                            (process.memory_percent || 0) > 20 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-green-100 text-green-800'
                                                        }`}>
                                                        {formatBytes(process.memory_usage || 0)}
                                                        {process.memory_percent && ` (${formatPercentage(process.memory_percent)})`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatPercentage(process.cpu_percent)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {process.username || 'Unknown'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                                No memory process data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {processData.total_pages > 1 && (
                            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>

                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {processData.total_pages}
                                </span>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= processData.total_pages}
                                    className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedAgent && !loading && (
                <div className="text-center py-12 text-gray-500">
                    <p>Please select an agent to view process information</p>
                    {agents.length === 0 && (
                        <p className="mt-2 text-sm">No agents available. Make sure agents are registered and active.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProcessMonitor;