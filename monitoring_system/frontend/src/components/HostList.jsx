// src/components/HostList.js
import React from 'react';

const HostList = ({ agents, onHostSelect }) => {
    const getStatusColor = (agent) => {
        if (!agent.is_active || !agent.is_approved) return 'bg-red-100 text-red-800';
        if (agent.is_active && agent.is_approved) return 'bg-green-100 text-green-800';
        return 'bg-yellow-100 text-yellow-800';
    };

    const getStatusText = (agent) => {
        if (!agent.is_active) return 'Inactive';
        if (!agent.is_approved) return 'Pending Approval';
        return 'Active';
    };

    const formatLastSeen = (timestamp) => {
        if (!timestamp) return 'Never';
        const now = new Date();
        const lastSeen = new Date(timestamp);
        const diffMs = now - lastSeen;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    };

    return (
        <div className="space-y-3">
            {agents.map(agent => (
                <div
                    key={agent.id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onHostSelect(agent.hostname)}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-gray-900">{agent.hostname}</h3>
                            <p className="text-sm text-gray-600">{agent.username}@{agent.ip_address}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent)}`}>
                            {getStatusText(agent)}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Last seen: {formatLastSeen(agent.last_seen)}
                    </div>
                </div>
            ))}

            {agents.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                    No agents registered
                </div>
            )}
        </div>
    );
};

export default HostList;