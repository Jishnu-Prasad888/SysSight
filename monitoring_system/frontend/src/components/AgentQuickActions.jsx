// src/components/AgentQuickActions.jsx
import React from 'react';
import { Monitor, Users, Clock, AlertCircle } from 'lucide-react';

const AgentQuickActions = ({ pendingCount, onNavigate }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Agent Management</h3>

            <div className="space-y-4">
                <button
                    onClick={() => onNavigate?.('agents')}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-gray-900">Manage Agents</p>
                            <p className="text-sm text-gray-500">Approve/reject registration requests</p>
                        </div>
                    </div>

                    {pendingCount > 0 && (
                        <span className="bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1.5 rounded-full border border-red-200">
                            {pendingCount} pending
                        </span>
                    )}
                </button>

                <div className="flex space-x-3">
                    <button
                        onClick={() => onNavigate?.('agents')}
                        className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                    >
                        View All Agents
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentQuickActions;