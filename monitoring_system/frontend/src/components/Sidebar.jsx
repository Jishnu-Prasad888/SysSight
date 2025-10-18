// src/components/Sidebar.jsx
import React from 'react';

const Sidebar = ({ currentView, onViewChange, selectedHost }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'metrics', label: 'Host Metrics', icon: '📈' },
        { id: 'agents', label: 'Agent Management', icon: '🖥️' },
        { id: 'processes', label: 'Process Monitor', icon: '⚙️' },
        { id: 'alerts', label: 'Alerts', icon: '🚨' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <div className="w-64 bg-white shadow-lg">
            <div className="p-4 border-b">
                <h1 className="text-xl font-bold text-gray-800">MonitorHub</h1>
                {selectedHost && (
                    <p className="text-sm text-gray-600 mt-1">Host: {selectedHost}</p>
                )}
            </div>

            <nav className="p-4">
                <ul className="space-y-2">
                    {menuItems.map(item => (
                        <li key={item.id}>
                            <button
                                onClick={() => onViewChange(item.id)}
                                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentView === item.id
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;