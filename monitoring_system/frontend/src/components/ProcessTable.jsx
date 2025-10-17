// src/components/ProcessTable.jsx
import React from 'react';

const ProcessTable = ({ processes = [], loading }) => { // Fix: Provide default empty array
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 text-center">Loading processes...</div>
            </div>
        );
    }

    // Additional safety check
    if (!processes || !Array.isArray(processes)) {
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 text-center text-gray-500">
                    No process data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                PID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                CPU %
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Memory %
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Memory (MB)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processes.map((process, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {process.pid}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {process.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`px-2 py-1 rounded-full text-xs ${(process.cpu_percent || 0) > 50 ? 'bg-red-100 text-red-800' :
                                            (process.cpu_percent || 0) > 20 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                        }`}>
                                        {(process.cpu_percent || 0).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`px-2 py-1 rounded-full text-xs ${(process.memory_percent || 0) > 50 ? 'bg-red-100 text-red-800' :
                                            (process.memory_percent || 0) > 20 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                        }`}>
                                        {(process.memory_percent || 0).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {((process.memory_bytes || 0) / 1024 / 1024).toFixed(1)} MB
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {processes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No processes found
                </div>
            )}
        </div>
    );
};

export default ProcessTable;