// src/components/AlertsPanel.jsx
import React, { useState, useEffect } from 'react';
import { getAlerts, resolveAlert, unresolveAlert, deleteAlert, addAlertNote, bulkResolveAlerts, bulkUnresolveAlerts, bulkDeleteAlerts, getAgents } from '../services/api';
import AlertItem from './AlertItem';
import { Filter, CheckSquare, Square, RefreshCw, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const AlertsPanel = () => {
    const [alerts, setAlerts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [filters, setFilters] = useState({
        resolved: '',
        level: '',
        agent: '',
        alert_type: ''
    });
    const [loading, setLoading] = useState(true);
    const [selectedAlerts, setSelectedAlerts] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        next: null,
        previous: null
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadAlerts, 30000);
        return () => clearInterval(interval);
    }, [filters, pagination.current]);

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
            setLoading(true);
            const response = await getAlerts(filters, pagination.current, pagination.pageSize);
            console.log('Alerts response:', response);

            setAlerts(response.alerts || []);
            setPagination(response.pagination || {
                current: 1,
                pageSize: 20,
                total: 0,
                totalPages: 0,
                next: null,
                previous: null
            });
            setSelectedAlerts(new Set());
        } catch (error) {
            console.error('Failed to load alerts:', error);
            setAlerts([]);
            setPagination({
                current: 1,
                pageSize: 20,
                total: 0,
                totalPages: 0,
                next: null,
                previous: null
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResolveAlert = async (alertId) => {
        try {
            await resolveAlert(alertId);
            setAlerts(prevAlerts =>
                prevAlerts.map(alert =>
                    alert.id === alertId
                        ? { ...alert, resolved: true, resolved_at: new Date().toISOString() }
                        : alert
                )
            );
        } catch (error) {
            console.error('Failed to resolve alert:', error);
            alert(`Failed to resolve alert: ${error.message}`);
        }
    };

    const handleUnresolveAlert = async (alertId) => {
        try {
            await unresolveAlert(alertId);
            setAlerts(prevAlerts =>
                prevAlerts.map(alert =>
                    alert.id === alertId
                        ? { ...alert, resolved: false, resolved_at: null }
                        : alert
                )
            );
        } catch (error) {
            console.error('Failed to unresolve alert:', error);
            alert(`Failed to unresolve alert: ${error.message}`);
        }
    };

    const handleDeleteAlert = async (alertId) => {
        if (window.confirm('Are you sure you want to delete this alert?')) {
            try {
                await deleteAlert(alertId);
                setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
                setSelectedAlerts(prev => {
                    const newSelected = new Set(prev);
                    newSelected.delete(alertId);
                    return newSelected;
                });
                setPagination(prev => ({
                    ...prev,
                    total: Math.max(0, prev.total - 1)
                }));
            } catch (error) {
                console.error('Failed to delete alert:', error);
                alert(`Failed to delete alert: ${error.message}`);
            }
        }
    };

    const handleAddNote = async (alertId, note) => {
        try {
            await addAlertNote(alertId, note);
            loadAlerts();
        } catch (error) {
            console.error('Failed to add note:', error);
            alert(`Failed to add note: ${error.message}`);
        }
    };

    const handleSelectAlert = (alertId, isSelected) => {
        const newSelected = new Set(selectedAlerts);
        if (isSelected) {
            newSelected.add(alertId);
        } else {
            newSelected.delete(alertId);
        }
        setSelectedAlerts(newSelected);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedAlerts(new Set(alerts.map(alert => alert.id)));
        } else {
            setSelectedAlerts(new Set());
        }
    };

    const handleBulkAction = async () => {
        if (selectedAlerts.size === 0) {
            alert('Please select alerts to perform bulk action');
            return;
        }

        const alertIds = Array.from(selectedAlerts);
        const currentPageAlertIds = alerts.map(alert => alert.id);
        const validAlertIds = alertIds.filter(id => currentPageAlertIds.includes(id));

        if (validAlertIds.length === 0) {
            alert('No valid alerts selected from the current page');
            return;
        }

        console.log('Performing bulk action on alerts from current page:', validAlertIds);

        try {
            let result;
            switch (bulkAction) {
                case 'resolve':
                    if (window.confirm(`Mark ${validAlertIds.length} alert(s) on this page as resolved?`)) {
                        result = await bulkResolveAlerts(validAlertIds);
                        setAlerts(prevAlerts =>
                            prevAlerts.map(alert =>
                                validAlertIds.includes(alert.id)
                                    ? { ...alert, resolved: true, resolved_at: new Date().toISOString() }
                                    : alert
                            )
                        );
                        alert(result.message || `${validAlertIds.length} alerts resolved successfully`);
                    }
                    break;
                case 'unresolve':
                    if (window.confirm(`Mark ${validAlertIds.length} alert(s) on this page as unresolved?`)) {
                        result = await bulkUnresolveAlerts(validAlertIds);
                        setAlerts(prevAlerts =>
                            prevAlerts.map(alert =>
                                validAlertIds.includes(alert.id)
                                    ? { ...alert, resolved: false, resolved_at: null }
                                    : alert
                            )
                        );
                        alert(result.message || `${validAlertIds.length} alerts unresolved successfully`);
                    }
                    break;
                case 'delete':
                    if (window.confirm(`Delete ${validAlertIds.length} alert(s) from this page? This action cannot be undone.`)) {
                        result = await bulkDeleteAlerts(validAlertIds);
                        setAlerts(prevAlerts => prevAlerts.filter(alert => !validAlertIds.includes(alert.id)));
                        setPagination(prev => ({
                            ...prev,
                            total: Math.max(0, prev.total - validAlertIds.length)
                        }));
                        alert(result.message || `${validAlertIds.length} alerts deleted successfully`);
                    }
                    break;
                default:
                    return;
            }

            setBulkAction('');
            setSelectedAlerts(new Set());
        } catch (error) {
            console.error('Bulk action failed:', error);
            alert(`Failed to perform bulk action: ${error.message}`);
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({
            ...prev,
            current: newPage
        }));
    };

    const handlePageSizeChange = (newSize) => {
        setPagination(prev => ({
            ...prev,
            pageSize: parseInt(newSize),
            current: 1
        }));
    };

    const levelColors = {
        low: 'green',
        medium: 'yellow',
        high: 'orange',
        critical: 'red'
    };

    const getPageNumbers = () => {
        const pages = [];
        const totalPages = pagination.totalPages;
        const currentPage = pagination.current;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const isAllOnCurrentPageSelected = alerts.length > 0 && selectedAlerts.size === alerts.length;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {/* Page Size Selector */}
                    <select
                        value={pagination.pageSize}
                        onChange={(e) => handlePageSizeChange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>

                    <div className="flex gap-2 flex-wrap">
                        <select
                            value={filters.level}
                            onChange={(e) => {
                                setFilters({ ...filters, level: e.target.value });
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Levels</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>

                        <select
                            value={filters.resolved}
                            onChange={(e) => {
                                setFilters({ ...filters, resolved: e.target.value });
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="false">Unresolved</option>
                            <option value="true">Resolved</option>
                        </select>

                        <select
                            value={filters.agent}
                            onChange={(e) => {
                                setFilters({ ...filters, agent: e.target.value });
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Agents</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.hostname}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={loadAlerts}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {alerts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isAllOnCurrentPageSelected}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Select all on this page ({selectedAlerts.size} selected)
                                </span>
                            </label>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Bulk Actions</option>
                                <option value="resolve">Mark as Resolved</option>
                                <option value="unresolve">Mark as Unresolved</option>
                                <option value="delete">Delete</option>
                            </select>

                            <button
                                onClick={handleBulkAction}
                                disabled={!bulkAction || selectedAlerts.size === 0}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading alerts...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <p className="text-gray-500">No alerts found</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {Object.values(filters).some(f => f) ? 'Try adjusting your filters' : 'Alerts will appear here when detected'}
                        </p>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <AlertItem
                            key={alert.id}
                            alert={alert}
                            onResolve={handleResolveAlert}
                            onUnresolve={handleUnresolveAlert}
                            onDelete={handleDeleteAlert}
                            onAddNote={handleAddNote}
                            isSelected={selectedAlerts.has(alert.id)}
                            onSelect={handleSelectAlert}
                            levelColors={levelColors}
                            showCheckbox={true}
                        />
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                        Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
                        {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
                        {pagination.total} alerts
                    </div>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => handlePageChange(pagination.current - 1)}
                            disabled={!pagination.previous}
                            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {getPageNumbers().map((page, index) => (
                            page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                                    <MoreHorizontal className="w-4 h-4" />
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${pagination.current === page
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            )
                        ))}

                        <button
                            onClick={() => handlePageChange(pagination.current + 1)}
                            disabled={!pagination.next}
                            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertsPanel;