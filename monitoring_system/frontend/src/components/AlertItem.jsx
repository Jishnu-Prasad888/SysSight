// src/components/AlertItem.js
import React from 'react';

const AlertItem = ({ alert, onResolve, levelColors }) => {
    const getLevelColor = (level) => {
        const colors = {
            low: 'bg-green-100 text-green-800 border-green-200',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            high: 'bg-orange-100 text-orange-800 border-orange-200',
            critical: 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[level] || colors.medium;
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className={`border-l-4 rounded-lg p-4 shadow-sm ${alert.resolved
                ? 'bg-gray-50 border-gray-300'
                : getLevelColor(alert.level)
            }`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center space-x-3">
                        <h3 className={`font-semibold ${alert.resolved ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                            {alert.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.resolved ? 'bg-gray-200 text-gray-700' : getLevelColor(alert.level)
                            }`}>
                            {alert.level.toUpperCase()}
                        </span>
                        {alert.resolved && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                RESOLVED
                            </span>
                        )}
                    </div>

                    <p className={`mt-1 ${alert.resolved ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                        {alert.description}
                    </p>

                    <div className="mt-2 text-sm text-gray-500">
                        <span>Host: {alert.agent_hostname}</span>
                        <span className="mx-2">•</span>
                        <span>Created: {formatTime(alert.created_at)}</span>
                        {alert.resolved && (
                            <>
                                <span className="mx-2">•</span>
                                <span>Resolved: {formatTime(alert.resolved_at)}</span>
                            </>
                        )}
                    </div>
                </div>

                {!alert.resolved && (
                    <button
                        onClick={() => onResolve(alert.id)}
                        className="ml-4 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                        Mark Resolved
                    </button>
                )}
            </div>
        </div>
    );
};

export default AlertItem;