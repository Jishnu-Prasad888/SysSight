// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { getAgents, getStats, getMetrics, getPendingRegistrations } from '../services/api';
import { AlertTriangle, Server, Activity, CheckCircle, XCircle, RefreshCw, Users, Cpu, HardDrive, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [agents, setAgents] = useState([]);
    const [stats, setStats] = useState({
        total_agents: 0,
        active_agents: 0,
        pending_registrations: 0,
        recent_logs_count: 0,
        alerts_count: 0
    });
    const [recentMetrics, setRecentMetrics] = useState([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setError(null);

            const [agentsData, statsData, metricsData, pendingRequests] = await Promise.allSettled([
                getAgents().catch(e => { console.error('Agents error:', e); return []; }),
                getStats().catch(e => { console.error('Stats error:', e); return {}; }),
                getMetrics({ hours: 1 }).catch(e => { console.error('Metrics error:', e); return []; }),
                getPendingRegistrations().catch(e => { console.error('Pending requests error:', e); return []; })
            ]);

            setAgents(agentsData.status === 'fulfilled' && Array.isArray(agentsData.value) ? agentsData.value : []);
            setStats(statsData.status === 'fulfilled' && statsData.value ? statsData.value : {
                total_agents: 0,
                active_agents: 0,
                pending_registrations: 0,
                recent_logs_count: 0,
                alerts_count: 0
            });
            setRecentMetrics(metricsData.status === 'fulfilled' && Array.isArray(metricsData.value) ? metricsData.value.slice(0, 20) : []);
            setPendingRequestsCount(pendingRequests.status === 'fulfilled' && Array.isArray(pendingRequests.value) ? pendingRequests.value.length : 0);

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
            setPendingRequestsCount(0);
        } finally {
            setLoading(false);
        }
    };

    const MetricCard = ({ title, value, icon, color, onClick }) => {
        const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
            green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
            red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
        };

        return (
            <div
                onClick={onClick}
                className={`border rounded-lg p-6 cursor-pointer transition-colors duration-200 ${colorClasses[color] || colorClasses.blue}`}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium opacity-80">{title}</p>
                        <p className="text-3xl font-bold mt-2">{value || 0}</p>
                    </div>
                    <div className="text-3xl opacity-70">
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    const QuickActionCard = ({ title, description, icon, onClick, color = 'blue' }) => {
        const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
            green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
            red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
        };

        return (
            <button
                onClick={onClick}
                className={`w-full text-left p-4 border rounded-lg transition-colors duration-200 flex items-center justify-between group ${colorClasses[color]}`}
            >
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 bg-white">
                        {icon}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{title}</p>
                        <p className="text-sm text-gray-600">{description}</p>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
            </button>
        );
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <XCircle className="text-red-500 mr-2 w-5 h-5" />
                        <p className="text-red-700">{error}</p>
                    </div>
                    <button
                        onClick={loadDashboardData}
                        className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors duration-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-600 mt-1">Monitor your system health and security status</p>
                </div>
                <button
                    onClick={loadDashboardData}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Agents"
                    value={stats.total_agents || 0}
                    icon={<Server className="w-8 h-8" />}
                    color="blue"
                    onClick={() => navigate('/agents')}
                />
                <MetricCard
                    title="Active Agents"
                    value={stats.active_agents || 0}
                    icon={<Activity className="w-8 h-8" />}
                    color="green"
                    onClick={() => navigate('/agents')}
                />
                <MetricCard
                    title="Pending Requests"
                    value={stats.pending_registrations || pendingRequestsCount}
                    icon={<Users className="w-8 h-8" />}
                    color="yellow"
                    onClick={() => navigate('/agents')}
                />
                <MetricCard
                    title="Active Alerts"
                    value={stats.alerts_count || 0}
                    icon={<AlertTriangle className="w-8 h-8" />}
                    color="red"
                    onClick={() => navigate('/alerts')}
                />
            </div>

            {/* Quick Actions and System Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    <div className="space-y-3">
                        <QuickActionCard
                            title="View All Alerts"
                            description="Monitor and manage security alerts"
                            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                            onClick={() => navigate('/alerts')}
                            color="red"
                        />
                        <QuickActionCard
                            title="Manage Agents"
                            description="Approve and monitor connected agents"
                            icon={<Server className="w-5 h-5 text-blue-600" />}
                            onClick={() => navigate('/agents')}
                            color="blue"
                        />
                        <QuickActionCard
                            title="Process Monitor"
                            description="View system processes and resource usage"
                            icon={<Cpu className="w-5 h-5 text-green-600" />}
                            onClick={() => navigate('/processes')}
                            color="green"
                        />
                        <QuickActionCard
                            title="System Metrics"
                            description="Analyze performance and resource metrics"
                            icon={<Activity className="w-5 h-5 text-purple-600" />}
                            onClick={() => navigate('/metrics')}
                            color="blue"
                        />
                    </div>
                </div>

                {/* System Overview */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-gray-600">Active Monitoring Agents</span>
                                <span className="font-semibold text-green-600">
                                    {agents.filter(a => a.is_active && a.is_approved).length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-gray-600">Inactive/Pending Agents</span>
                                <span className="font-semibold text-yellow-600">
                                    {agents.filter(a => !a.is_active || !a.is_approved).length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-gray-600">Recent Metrics Data</span>
                                <span className="font-semibold text-blue-600">
                                    {recentMetrics.length} points
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">System Status</span>
                                <span className="font-semibold text-green-600">
                                    {stats.alerts_count === 0 ? 'Normal' : 'Attention Required'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Agent Status Summary */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-md font-semibold text-gray-900 mb-4">Agent Status Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {agents.filter(a => a.is_active && a.is_approved).length}
                                </div>
                                <div className="text-sm text-gray-600">Active</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {agents.filter(a => !a.is_active || !a.is_approved).length}
                                </div>
                                <div className="text-sm text-gray-600">Inactive</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;