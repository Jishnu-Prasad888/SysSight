// src/components/Dashboard.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { getAgents, getStats, getMetrics } from '../services/api';
import MetricCard from './MetricCard';
import HostList from './HostList';
import RealTimeChart from './RealTimeChart';

const Dashboard = ({ onHostSelect }) => {
    const [agents, setAgents] = useState([]);
    const [stats, setStats] = useState({
        total_agents: 0,
        active_agents: 0,
        pending_registrations: 0,
        recent_logs_count: 0,
        alerts_count: 0
    });
    const [recentMetrics, setRecentMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setError(null);
            console.log('Loading dashboard data...');

            // Load all data in parallel
            const [agentsData, statsData, metricsData] = await Promise.all([
                getAgents().catch(e => { console.error('Agents error:', e); return []; }),
                getStats().catch(e => { console.error('Stats error:', e); return {}; }),
                getMetrics({ hours: 1 }).catch(e => { console.error('Metrics error:', e); return []; })
            ]);

            console.log('Agents:', agentsData);
            console.log('Stats:', statsData);
            console.log('Metrics:', metricsData);

            setAgents(Array.isArray(agentsData) ? agentsData : []);
            setStats(statsData || {
                total_agents: 0,
                active_agents: 0,
                pending_registrations: 0,
                recent_logs_count: 0,
                alerts_count: 0
            });
            setRecentMetrics(Array.isArray(metricsData) ? metricsData.slice(0, 20) : []);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError('Failed to load dashboard data. Please check your connection.');
            setAgents([]);
            setStats({
                total_agents: 0,
                active_agents: 0,
                pending_registrations: 0,
                recent_logs_count: 0,
                alerts_count: 0
            });
            setRecentMetrics([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-lg">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={loadDashboardData}
                        className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <button
                    onClick={loadDashboardData}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                >
                    <span>🔄</span>
                    <span>Refresh</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Agents"
                    value={stats.total_agents || 0}
                    icon="🖥️"
                    color="blue"
                />
                <MetricCard
                    title="Active Agents"
                    value={stats.active_agents || 0}
                    icon="✅"
                    color="green"
                />
                <MetricCard
                    title="Pending Registrations"
                    value={stats.pending_registrations || 0}
                    icon="⏳"
                    color="yellow"
                />
                <MetricCard
                    title="Active Alerts"
                    value={stats.alerts_count || 0}
                    icon="🚨"
                    color="red"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-time Metrics Chart */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Real-time Metrics</h2>
                        {recentMetrics.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-gray-500">
                                <div className="text-center">
                                    <p className="mb-2">No metrics data available</p>
                                    <p className="text-sm">Waiting for agents to send data...</p>
                                </div>
                            </div>
                        ) : (
                            <RealTimeChart metrics={recentMetrics} />
                        )}
                    </div>
                </div>

                {/* Hosts List */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Hosts ({agents.length})</h2>
                    {agents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="mb-2">No agents registered</p>
                            <p className="text-sm">Run the setup on your hosts to register agents</p>
                        </div>
                    ) : (
                        <HostList
                            agents={agents}
                            onHostSelect={onHostSelect}
                        />
                    )}
                </div>
            </div>

            {/* Recent Logs Summary */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">System Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Recent Logs (24h)</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.recent_logs_count || 0}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Active Monitoring</p>
                        <p className="text-2xl font-bold text-green-600">
                            {agents.filter(a => a.is_active && a.is_approved).length}
                        </p>
                    </div>
                    <div className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Inactive/Pending</p>
                        <p className="text-2xl fpont-bold text-orange-600">
                            {agents.filter(a => !a.is_active || !a.is_approved).length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;