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
    const [timeRange, setTimeRange] = useState('1');
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
    const debugMetricsData = async (agentId) => {
        try {
            const response = await fetch(`/api/metrics/debug_metrics/?agent_id=${agentId}&hours=${timeRange}`);
            const debugData = await response.json();
            console.log('Debug Metrics Data:', debugData);
        } catch (error) {
            console.error('Debug endpoint error:', error);
        }
    };
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
        if (!agentId) return;

        setLoading(true);
        setError(null);

        try {
            console.log(`🔍 Loading metrics for agent ${agentId}, last ${timeRange} hour(s)`);

            const metricsData = await getMetrics({
                agent_id: agentId,
                hours: parseInt(timeRange, 10)  // Ensure it’s a number
            });

            console.log('🔍 Metrics received:', metricsData.length, metricsData);

            setMetrics(Array.isArray(metricsData) ? metricsData : []);
        } catch (error) {
            console.error('🔍 Failed to load metrics:', error);
            setMetrics([]);
            setError(`Failed to load metrics: ${error.message}`);
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
                        <option value="720">Last 30 days</option>
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
            ) : metrics.length === 0 && selectedAgent ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="max-w-md mx-auto">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No Metrics Data Yet
                        </h3>
                        <p className="text-gray-500 mb-4">
                            No metrics have been collected from <strong>{selectedHost}</strong> in the last {timeRange} hours.
                        </p>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-6">
                            <h4 className="font-semibold text-blue-800 mb-2">Troubleshooting Steps:</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Verify the agent service is running on the host</li>
                                <li>• Check agent logs for errors</li>
                                <li>• Ensure metrics collection is enabled in agent config</li>
                                <li>• Verify network connectivity to the server</li>
                                <li>• Wait a few minutes for initial data collection</li>
                            </ul>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handleRefresh}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                            >
                                Check Again
                            </button>
                            <button
                                onClick={() => setTimeRange('168')}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                            >
                                Check Last 7 Days
                            </button>
                        </div>
                    </div>
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
                                    label={metricType.label}
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