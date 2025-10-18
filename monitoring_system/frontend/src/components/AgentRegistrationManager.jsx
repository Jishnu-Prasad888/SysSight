// src/components/AgentRegistrationManager.jsx
import React, { useState, useEffect } from 'react';
import { getPendingRegistrations, approveRegistration, rejectRegistration, getAgents } from '../services/api';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Check, X } from 'lucide-react';

const AgentRegistrationManager = () => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [rejectNotes, setRejectNotes] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [requests, agentsData] = await Promise.all([
                getPendingRegistrations(),
                getAgents()
            ]);
            setPendingRequests(requests);
            setAgents(agentsData);
        } catch (error) {
            console.error('Failed to load data:', error);
            setError('Failed to load registration requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const result = await approveRegistration(requestId);

            setSuccess(`Agent approved successfully! Agent ID: ${result.agent_id}`);
            await loadData();
        } catch (error) {
            console.error('Approval failed:', error);
            setError(error.response?.data?.error || 'Failed to approve agent');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (requestId) => {
        const notes = rejectNotes[requestId] || '';

        if (!notes.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            await rejectRegistration(requestId, { notes });

            setSuccess('Registration request rejected');
            setRejectNotes(prev => ({ ...prev, [requestId]: '' }));
            await loadData();
        } catch (error) {
            console.error('Rejection failed:', error);
            setError(error.response?.data?.error || 'Failed to reject request');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectNotesChange = (requestId, notes) => {
        setRejectNotes(prev => ({
            ...prev,
            [requestId]: notes
        }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agent Registration Management</h1>
                    <p className="text-gray-600 mt-1">Approve or reject agent registration requests</p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="text-red-500 mr-2 w-5 h-5" />
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <CheckCircle className="text-green-500 mr-2 w-5 h-5" />
                        <p className="text-green-700">{success}</p>
                    </div>
                </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-blue-600">{pendingRequests.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Approved Agents</p>
                    <p className="text-2xl font-bold text-green-600">
                        {agents.filter(a => a.is_approved).length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600">Active Agents</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {agents.filter(a => a.is_active).length}
                    </p>
                </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 md:p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Pending Registration Requests</h2>
                </div>

                {loading && pendingRequests.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading requests...</p>
                    </div>
                ) : pendingRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <p>No pending registration requests</p>
                        <p className="text-sm mt-1">All requests have been processed</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {pendingRequests.map((request) => (
                            <div key={request.id} className="p-4 md:p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    {/* Request Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {request.hostname}
                                            </h3>
                                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                                                Pending
                                            </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">User:</span> {request.username}
                                            </div>
                                            <div>
                                                <span className="font-medium">IP Address:</span> {request.ip_address}
                                            </div>
                                            <div>
                                                <span className="font-medium">Requested:</span> {formatDate(request.requested_at)}
                                            </div>
                                        </div>

                                        {/* Rejection Notes Input */}
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Rejection Reason (required for rejection):
                                            </label>
                                            <textarea
                                                value={rejectNotes[request.id] || ''}
                                                onChange={(e) => handleRejectNotesChange(request.id, e.target.value)}
                                                placeholder="Enter reason for rejection..."
                                                rows="2"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(request.id)}
                                            disabled={loading}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
                                        >
                                            <Check className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={loading || !rejectNotes[request.id]?.trim()}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
                                        >
                                            <X className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved Agents List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 md:p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Approved Agents</h2>
                </div>

                {agents.filter(a => a.is_approved).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No approved agents yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hostname
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Seen
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {agents
                                    .filter(agent => agent.is_approved)
                                    .map((agent) => (
                                        <tr key={agent.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{agent.hostname}</div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">
                                                {agent.username}
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">
                                                {agent.ip_address}
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${agent.is_active
                                                    ? 'bg-green-100 text-green-800 border-green-200'
                                                    : 'bg-red-100 text-red-800 border-red-200'
                                                    }`}>
                                                    {agent.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-600">
                                                {agent.last_seen ? formatDate(agent.last_seen) : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentRegistrationManager;