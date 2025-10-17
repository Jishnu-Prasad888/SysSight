// src/components/ProcessMonitor.jsx
import React, { useState, useEffect } from 'react';
import { getProcesses, getAgents } from '../services/api';
import ProcessTable from './ProcessTable';

const ProcessMonitor = ({ host }) => {
    const [selectedHost, setSelectedHost] = useState(host || ''); // Fix: Use empty string instead of null
    const [processes, setProcesses] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadAgents();
    }, []);

    useEffect(() => {
        if (selectedHost) {
            loadProcesses();
        }
    }, [selectedHost, currentPage]);

    const loadAgents = async () => {
        try {
            const agentsData = await getAgents();
            setAgents(agentsData);
            if (!selectedHost && agentsData.length > 0) {
                setSelectedHost(agentsData[0].hostname);
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
            setError('Failed to load agents');
        }
    };

    const loadProcesses = async () => {
        if (!selectedHost) return;

        setLoading(true);
        setError(null);
        try {
            const response = await getProcesses(selectedHost, currentPage);
            console.log('Processes response:', response); // Debug log

            // Merge or choose which process list to display
            const cpuProcesses = response?.top_cpu_processes || [];
            const memoryProcesses = response?.top_memory_processes || [];

            // You can choose one of these behaviors:

            // (A) Show memory-based list (most likely for your UI)
            const processesData = memoryProcesses;

            // (B) OR, show both combined (uncomment if desired)
            // const processesData = [...cpuProcesses, ...memoryProcesses];

            console.log("processesData:", processesData);

            setProcesses(processesData);
            setTotalPages(response?.total_pages || 1);

            if (processesData.length === 0) {
                setError('No processes found for this host');
            }
        } catch (error) {
            console.error('Failed to load processes:', error);
            setError('Failed to load processes');
            setProcesses([]); // Always reset to empty array
        } finally {
            setLoading(false);
        }
    };


    const refreshProcesses = () => {
        setCurrentPage(1);
        loadProcesses();
    };

    const handleHostChange = (newHost) => {
        setSelectedHost(newHost);
        setCurrentPage(1);
        setProcesses([]); // Clear processes when host changes
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Process Monitor</h1>

                <div className="flex space-x-4">
                    <select
                        value={selectedHost} // Now this is always a string, never null
                        onChange={(e) => handleHostChange(e.target.value)}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">Select Host</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.hostname}>
                                {agent.hostname}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={refreshProcesses}
                        disabled={loading || !selectedHost}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-700">{error}</p>
                </div>
            )}

            {!selectedHost ? (
                <div className="text-center py-8 text-gray-500">
                    Please select a host to view processes
                </div>
            ) : (
                <>
                    <ProcessTable
                        processes={processes}
                        loading={loading}
                    />

                    {totalPages > 1 && (
                        <div className="flex justify-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <span className="px-3 py-1">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProcessMonitor;