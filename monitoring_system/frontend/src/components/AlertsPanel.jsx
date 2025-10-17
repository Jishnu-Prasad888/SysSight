// src/components/AlertsPanel.jsx - FIXED BULK DELETE
import React, { useState, useEffect } from 'react';
import { getAlerts, resolveAlert, unresolveAlert, deleteAlert, addAlertNote, bulkResolveAlerts, bulkUnresolveAlerts, bulkDeleteAlerts, getAgents } from '../services/api';
import AlertItem from './AlertItem';

const AlertsPanel = () => {
    const [alerts, setAlerts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [filters, setFilters] = useState({
        resolved: '', // Show all alerts by default
        level: '',
        agent: '',
        alert_type: ''
    });
    const [loading, setLoading] = useState(true);
    const [selectedAlerts, setSelectedAlerts] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');

    // Pagination state
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
            // Update local state for better UX
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
            // Update local state
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
                // Remove from local state
                setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
                // Also remove from selected alerts
                setSelectedAlerts(prev => {
                    const newSelected = new Set(prev);
                    newSelected.delete(alertId);
                    return newSelected;
                });
                // Update pagination total
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
            // Reload to get updated notes
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
            // Only select alerts on the current page
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

        // Double-check that we're only operating on alerts from the current page
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
                        // Update local state for resolved alerts on current page
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
                        // Update local state for unresolved alerts on current page
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
                        // Remove deleted alerts from local state (current page only)
                        setAlerts(prevAlerts => prevAlerts.filter(alert => !validAlertIds.includes(alert.id)));
                        // Update pagination total
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

    // Pagination handlers
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

    // Generate page numbers for pagination
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

    // Check if all alerts on current page are selected
    const isAllOnCurrentPageSelected = alerts.length > 0 && selectedAlerts.size === alerts.length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Alerts</h1>

                <div className="flex space-x-4 items-center">
                    {/* Page Size Selector */}
                    <select
                        value={pagination.pageSize}
                        onChange={(e) => handlePageSizeChange(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>

                    <select
                        value={filters.level}
                        onChange={(e) => {
                            setFilters({ ...filters, level: e.target.value });
                            setPagination(prev => ({ ...prev, current: 1 }));
                        }}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Levels</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>

                    <select
                        value={filters.alert_type}
                        onChange={(e) => {
                            setFilters({ ...filters, alert_type: e.target.value });
                            setPagination(prev => ({ ...prev, current: 1 }));
                        }}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Types</option>
                        <option value="process">Process</option>
                        <option value="network">Network</option>
                        <option value="authentication">Authentication</option>
                        <option value="resource">Resource</option>
                        <option value="security">Security</option>
                        <option value="system">System</option>
                    </select>

                    <select
                        value={filters.agent}
                        onChange={(e) => {
                            setFilters({ ...filters, agent: e.target.value });
                            setPagination(prev => ({ ...prev, current: 1 }));
                        }}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Hosts</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                                {agent.hostname}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.resolved}
                        onChange={(e) => {
                            setFilters({ ...filters, resolved: e.target.value });
                            setPagination(prev => ({ ...prev, current: 1 }));
                        }}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">All Alerts</option>
                        <option value="false">Unresolved Only</option>
                        <option value="true">Resolved Only</option>
                    </select>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {alerts.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={isAllOnCurrentPageSelected}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Select All on This Page ({selectedAlerts.size} selected)
                                </span>
                            </label>

                            <select
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">Bulk Actions</option>
                                <option value="resolve">Mark Resolved</option>
                                <option value="unresolve">Mark Unresolved</option>
                                <option value="delete">Delete</option>
                            </select>

                            <button
                                onClick={handleBulkAction}
                                disabled={!bulkAction || selectedAlerts.size === 0}
                                className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Apply to Selected ({selectedAlerts.size})
                            </button>
                        </div>

                        <div className="text-sm text-gray-600">
                            Page {pagination.current} of {pagination.totalPages} •
                            Showing {alerts.length} of {pagination.total} alerts
                            {filters.resolved === 'false' && ' (Unresolved only)'}
                            {filters.resolved === 'true' && ' (Resolved only)'}
                        </div>
                    </div>

                    {/* Selection info */}
                    {selectedAlerts.size > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                            ✓ {selectedAlerts.size} alert(s) selected on this page
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">Loading alerts...</div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No alerts found
                    <div className="mt-4 text-sm">
                        <p>This could mean:</p>
                        <ul className="list-disc list-inside text-left inline-block mt-2">
                            <li>No alerts exist in the system</li>
                            <li>The current filter excludes all alerts</li>
                            <li>There's an API connection issue</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <AlertItem
                                key={alert.id}
                                alert={alert}
                                onResolve={handleResolveAlert}
                                onUnresolve={handleUnresolveAlert}
                                onDelete={handleDeleteAlert}
                                onAddNote={handleAddNote}
                                onSelect={handleSelectAlert}
                                isSelected={selectedAlerts.has(alert.id)}
                                showCheckbox={true}
                                levelColors={levelColors}
                            />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div className="flex justify-between items-center pt-4 border-t">
                            <div className="text-sm text-gray-600">
                                Showing {(pagination.current - 1) * pagination.pageSize + 1} to{' '}
                                {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
                                {pagination.total} alerts
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handlePageChange(pagination.current - 1)}
                                    disabled={pagination.current <= 1}
                                    className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>

                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
                                        className={`px-3 py-2 border rounded-lg text-sm min-w-[40px] ${page === pagination.current
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'hover:bg-gray-50'
                                            } ${typeof page !== 'number' ? 'cursor-default hover:bg-transparent' : ''}`}
                                        disabled={typeof page !== 'number'}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(pagination.current + 1)}
                                    disabled={pagination.current >= pagination.totalPages}
                                    className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AlertsPanel;