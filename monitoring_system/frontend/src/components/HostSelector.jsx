// src/components/HostSelector.js
import React from 'react';

const HostSelector = ({ agents, selectedHost, onHostChange }) => {
    // Ensure agents is always an array
    const agentsArray = Array.isArray(agents) ? agents : [];

    return (
        <select
            value={selectedHost || ''}
            onChange={(e) => onHostChange(e.target.value)}
            className="border rounded-lg px-3 py-2 min-w-48"
        >
            <option value="">Select a host</option>
            {agentsArray.map(agent => (
                <option key={agent.id} value={agent.hostname}>
                    {agent.hostname}
                </option>
            ))}
        </select>
    );
};

export default HostSelector;