// src/components/MetricCard.js
import React from 'react';

const MetricCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        red: 'bg-red-50 border-red-200 text-red-700',
    };

    return (
        <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
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

export default MetricCard;