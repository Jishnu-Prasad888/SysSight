// src/components/AlertItem.jsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, Trash2, Eye, EyeOff, Server, Clock, User, Network, Cpu, HardDrive } from 'lucide-react';

const AlertItem = ({ alert, onResolve, onUnresolve, onAddNote, onDelete, isSelected, onSelect, levelColors, showCheckbox = false }) => {
    const [showNotes, setShowNotes] = useState(false);
    const [newNote, setNewNote] = useState('');

    const getLevelColor = (level) => {
        const colors = {
            low: 'bg-green-100 text-green-800 border-green-200',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            high: 'bg-orange-100 text-orange-800 border-orange-200',
            critical: 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[level] || colors.medium;
    };

    const getAlertTypeColor = (type) => {
        const colors = {
            process: 'bg-purple-100 text-purple-800 border-purple-200',
            network: 'bg-blue-100 text-blue-800 border-blue-200',
            authentication: 'bg-pink-100 text-pink-800 border-pink-200',
            resource: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            security: 'bg-red-100 text-red-800 border-red-200',
            system: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[type] || colors.system;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const handleAddNote = () => {
        if (newNote.trim()) {
            onAddNote(alert.id, newNote.trim());
            setNewNote('');
            setShowNotes(false);
        }
    };

    const renderMetadata = () => {
        if (!alert.metadata || typeof alert.metadata !== 'object') return null;

        return (
            <div className="mt-3 flex flex-wrap gap-2">
                {alert.metadata.process_name && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs border border-purple-200 flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        Process: {alert.metadata.process_name}
                    </span>
                )}
                {alert.metadata.source_ip && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs border border-blue-200 flex items-center gap-1">
                        <Network className="w-3 h-3" />
                        Source: {alert.metadata.source_ip}
                    </span>
                )}
                {alert.metadata.destination_ip && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs border border-green-200 flex items-center gap-1">
                        <Network className="w-3 h-3" />
                        Dest: {alert.metadata.destination_ip}
                    </span>
                )}
                {alert.metadata.port && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs border border-orange-200 flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        Port: {alert.metadata.port}
                    </span>
                )}
                {alert.metadata.user && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs border border-pink-200 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        User: {alert.metadata.user}
                    </span>
                )}
                {alert.metadata.current_value && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs border border-indigo-200 flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        Value: {alert.metadata.current_value}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className={`border-l-4 rounded-lg p-4 shadow-sm border ${alert.resolved
            ? 'bg-gray-50 border-gray-300'
            : getLevelColor(alert.level)
            } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                        {showCheckbox && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => onSelect(alert.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                            />
                        )}
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className={`font-semibold ${alert.resolved ? 'text-gray-600' : 'text-gray-900'}`}>
                                    {alert.title || 'Untitled Alert'}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${alert.resolved ? 'bg-gray-200 text-gray-700 border-gray-300' : getLevelColor(alert.level)}`}>
                                    {(alert.level || 'medium').toUpperCase()}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAlertTypeColor(alert.alert_type)}`}>
                                    {alert.alert_type_display || alert.alert_type || 'system'}
                                </span>
                                {alert.resolved && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs border border-green-200">
                                        RESOLVED
                                    </span>
                                )}
                            </div>

                            <p className={`mt-1 ${alert.resolved ? 'text-gray-500' : 'text-gray-700'}`}>
                                {alert.description || 'No description available'}
                            </p>

                            {renderMetadata()}

                            {/* Notes Section */}
                            {alert.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                                        <button
                                            onClick={() => setShowNotes(!showNotes)}
                                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                        >
                                            {showNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            {showNotes ? 'Hide' : 'Show'} Notes
                                        </button>
                                    </div>
                                    {showNotes && (
                                        <div className="text-sm text-gray-600 whitespace-pre-line">
                                            {alert.notes}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 text-sm text-gray-500 flex flex-wrap items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <Server className="w-4 h-4" />
                                    Host: {alert.agent_hostname || 'Unknown'}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Created: {formatTime(alert.triggered_at)}
                                </span>
                                {alert.resolved && alert.resolved_at && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" />
                                            Resolved: {formatTime(alert.resolved_at)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[140px]">
                    {!alert.resolved ? (
                        <button
                            onClick={() => onResolve(alert.id)}
                            className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 whitespace-nowrap flex items-center justify-center gap-2 transition-colors duration-200"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Mark Resolved
                        </button>
                    ) : (
                        <button
                            onClick={() => onUnresolve(alert.id)}
                            className="bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 whitespace-nowrap flex items-center justify-center gap-2 transition-colors duration-200"
                        >
                            <XCircle className="w-4 h-4" />
                            Mark Unresolved
                        </button>
                    )}

                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 whitespace-nowrap flex items-center justify-center gap-2 transition-colors duration-200"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Add Note
                    </button>

                    <button
                        onClick={() => onDelete(alert.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 whitespace-nowrap flex items-center justify-center gap-2 transition-colors duration-200"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>

            {/* Add Note Form */}
            {showNotes && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note about this alert..."
                        className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        rows="3"
                    />
                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            onClick={() => setShowNotes(false)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertItem;