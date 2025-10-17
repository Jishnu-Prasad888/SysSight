// src/components/HostMetrics.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { getMetrics, getAgents } from '../services/api';
import MetricChart from './MetricChart';
import HostSelector from './HostSelector';

const HostMetrics = ({ host }) => {
    const [selectedHost, setSelectedHost] = useState(host);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [metrics, setMetrics] = useState([]);
    const [agents, setAgents] = useState([]);
    const [timeRange, setTimeRange] = useState('24');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadAgents();
    }, []);

    useEffect(() => {
        if (selectedHost && agents.length > 0) {
            const agent = agents.find(a => a.hostname === selectedHost);
            if (agent) {
                setSelectedAgent(agent);
                loadMetrics(agent.id);
            }
        }
    }, [selectedHost, agents, timeRange]);

    const loadAgents = async () => {
        try {
            console.log('Loading agents for metrics...');
            const agentsData = await getAgents();
            console.log('Agents loaded:', agentsData);

            setAgents(Array.isArray(agentsData) ? agentsData : []);

            // Auto-select first agent if none selected
            if (!selectedHost && agentsData.length > 0) {
                setSelectedHost(agentsData[0].hostname);
                setSelectedAgent(agentsData[0]);
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
            setAgents([]);
            setError('Failed to load agents');
        }
    };

    const loadMetrics = async (agentId) => {
        if (!agentId) {
            console.warn('No agent ID provided');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`Loading metrics for agent ${agentId}, timeRange: ${timeRange}h`);
            const metricsData = await getMetrics({
                agent_id: agentId,
                hours: timeRange
            });
            console.log('Metrics loaded:', metricsData);

            // Ensure we always have an array
            const metricsArray = Array.isArray(metricsData) ? metricsData : [];
            setMetrics(metricsArray);

            if (metricsArray.length === 0) {
                setError('No metrics data available for this agent in the selected time range');
            }
        } catch (error) {
            console.error('Failed to load metrics:', error);
            setMetrics([]);
            setError('Failed to load metrics data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleHostChange = (hostname) => {
        setSelectedHost(hostname);
        setMetrics([]); // Clear metrics while loading new ones
    };

    const handleRefresh = () => {
        if (selectedAgent) {
            loadMetrics(selectedAgent.id);
        }
    };

    const metricTypes = [
        { key: 'cpu_usage', label: 'CPU Usage', color: '#3B82F6', unit: '%' },
        { key: 'memory_usage', label: 'Memory Usage', color: '#10B981', unit: '%' },
        { key: 'disk_usage', label: 'Disk Usage', color: '#F59E0B', unit: '%' },
        { key: 'network_sent', label: 'Network Sent', color: '#8B5CF6', unit: 'MB' },
        { key: 'network_received', label: 'Network Received', color: '#EC4899', unit: 'MB' },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Host Metrics</h1>

                <div className="flex space-x-4">
                    <HostSelector
                        agents={agents}
                        selectedHost={selectedHost}
                        onHostChange={handleHostChange}
                    />

                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="1">Last 1 hour</option>
                        <option value="6">Last 6 hours</option>
                        <option value="24">Last 24 hours</option>
                        <option value="168">Last 7 days</option>
                    </select>

                    <button
                        onClick={handleRefresh}
                        disabled={loading || !selectedAgent}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {agents.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-500 mb-4">No agents available</p>
                    <p className="text-sm text-gray-400">Register agents to view metrics</p>
                </div>
            ) : !selectedHost ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    Please select a host to view metrics
                </div>
            ) : loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>Loading metrics for {selectedHost}...</p>
                </div>
            ) : error ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                    <p className="text-yellow-700 mb-4">{error}</p>
                    <p className="text-sm text-yellow-600 mb-4">
                        This might mean the agent hasn't sent any metrics yet.
                    </p>
                    <button
                        onClick={handleRefresh}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                    >
                        Retry
                    </button>
                </div>
            ) : metrics.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    <p className="mb-2">No metrics data available for {selectedHost}</p>
                    <p className="text-sm">Waiting for agent to send metrics...</p>
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-600">Total Data Points</p>
                            <p className="text-2xl font-bold text-blue-600">{metrics.length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-600">Latest Update</p>
                            <p className="text-lg font-semibold text-green-600">
                                {metrics.length > 0
                                    ? new Date(metrics[metrics.length - 1].timestamp).toLocaleTimeString()
                                    : 'N/A'
                                }
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <p className="text-sm text-gray-600">Monitoring</p>
                            <p className="text-lg font-semibold text-purple-600">
                                {selectedAgent?.is_active && selectedAgent?.is_approved ? 'Active' : 'Inactive'}
                            </p>
                        </div>
                    </div>

                    {/* Metric Charts */}
                    <div className="grid grid-cols-1 gap-6">
                        {metricTypes.map(metricType => (
                            <div key={metricType.key} className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">{metricType.label}</h3>
                                <MetricChart
                                    metrics={metrics}
                                    metricKey={metricType.key}
                                    color={metricType.color}
                                    unit={metricType.unit}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default HostMetrics;