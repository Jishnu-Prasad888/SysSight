// src/components/AlertsPanel.jsx
import React, { useState, useEffect } from 'react';
import { getAlerts, resolveAlert, getAgents } from '../services/api';
import AlertItem from './AlertItem';

const AlertsPanel = () => {
    const [alerts, setAlerts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [filters, setFilters] = useState({
        resolved: false,
        level: '',
        agent: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [filters]);

    const loadData = async () => {
        await Promise.all([loadAgents(), loadAlerts()]);
    };

    const loadAgents = async () => {
        try {
            const agentsData = await getAgents();
            setAgents(agentsData);
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    };

    const loadAlerts = async () => {
        try {
            console.log('Loading alerts with filters:', filters);
            const alertsData = await getAlerts(filters);
            console.log('Alerts loaded:', alertsData);

            // Ensure we always have an array
            setAlerts(Array.isArray(alertsData) ? alertsData : []);
        } catch (error) {
            console.error('Failed to load alerts:', error);
            setAlerts([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleResolveAlert = async (alertId) => {
        try {
            await resolveAlert(alertId);
            loadAlerts(); // Refresh the list
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const levelColors = {
        low: 'green',
        medium: 'yellow',
        high: 'orange',
        critical: 'red'
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Alerts</h1>

                <div className="flex space-x-4">
                    <select
                        value={filters.level}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Levels</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>

                    <select
                        value={filters.agent}
                        onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Hosts</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                                {agent.hostname}
                            </option>
                        ))}
                    </select>

                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={filters.resolved}
                            onChange={(e) => setFilters({ ...filters, resolved: e.target.checked })}
                            className="rounded"
                        />
                        <span>Show Resolved</span>
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8">Loading alerts...</div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No alerts found
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map(alert => (
                        <AlertItem
                            key={alert.id}
                            alert={alert}
                            onResolve={handleResolveAlert}
                            levelColors={levelColors}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AlertsPanel;